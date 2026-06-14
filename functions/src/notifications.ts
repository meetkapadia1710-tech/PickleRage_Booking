import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

type SplitPayment = {
  enabled?: boolean;
  groupSize?: number;
  paidPlayers?: string[];
  invitedFriends?: string[];
  reminderSent?: boolean;
};

/**
 * Send a push to every FCM token owned by the given users, then prune any tokens
 * the messaging service reports as invalid. Supports both the `fcmTokens` array
 * and the legacy singular `fcmToken` string.
 */
async function sendToUsers(
  userIds: (string | undefined)[],
  notification: { title: string; body: string },
  data: Record<string, string> = {},
): Promise<void> {
  const ids = [...new Set(userIds)].filter((id): id is string => !!id);
  if (ids.length === 0) return;

  const tokenOwners: { token: string; uid: string }[] = [];
  await Promise.all(ids.map(async (uid) => {
    const snap = await admin.firestore().collection('users').doc(uid).get();
    const u = snap.data();
    if (!u) return;
    if (Array.isArray(u['fcmTokens'])) {
      (u['fcmTokens'] as string[]).forEach(t => { if (t) tokenOwners.push({ token: t, uid }); });
    } else if (typeof u['fcmToken'] === 'string' && u['fcmToken']) {
      tokenOwners.push({ token: u['fcmToken'] as string, uid });
    }
  }));

  if (tokenOwners.length === 0) return;

  const tokens = tokenOwners.map(t => t.token);
  const res = await admin.messaging().sendEachForMulticast({ tokens, notification, data });
  console.log(`Sent: ${res.successCount}, Failed: ${res.failureCount}`);

  // Prune invalid tokens, grouped per owner.
  const staleByUser = new Map<string, string[]>();
  res.responses.forEach((r, i) => {
    if (!r.success) {
      const { token, uid } = tokenOwners[i];
      staleByUser.set(uid, [...(staleByUser.get(uid) ?? []), token]);
    }
  });
  await Promise.all([...staleByUser.entries()].map(([uid, stale]) =>
    admin.firestore().collection('users').doc(uid).update({
      fcmTokens: admin.firestore.FieldValue.arrayRemove(...stale),
    }).catch(() => undefined),
  ));
}

// ── On booking create: confirm to booker + invite split friends ───────────────
export const sendBookingConfirmation = functions.firestore
  .document('bookings/{bookingId}')
  .onCreate(async (snap, context) => {
    const b = snap.data();
    const bookingId = context.params['bookingId'] as string;
    const userId = b['userId'] as string | undefined;
    const date = b['date'] as string;
    const startTime = b['startTime'] as string;
    const status = b['status'] as string;

    try {
      // Booker: "confirmed" vs "on hold" depending on status.
      if (userId) {
        const msg = status === 'hold'
          ? { title: 'Slot on hold ⏸', body: `Your slot for ${date} at ${startTime} is held — it confirms once everyone pays.` }
          : { title: 'Booking Confirmed! 🎾', body: `Your court is locked in for ${date} at ${startTime}.` };
        await sendToUsers([userId], msg, { bookingId });
      }

      // Invited split friends: ask them to pay their share.
      const sp = b['splitPayment'] as SplitPayment | undefined;
      if (sp?.enabled && Array.isArray(sp.invitedFriends) && sp.invitedFriends.length > 0) {
        await sendToUsers(
          sp.invitedFriends,
          { title: "You're invited to split a booking 🎾", body: `Pay your share for ${date} at ${startTime}.` },
          { bookingId },
        );
      }
    } catch (error) {
      console.error('Error sending booking confirmation:', error);
    }
    return null;
  });

// ── On booking cancel: notify teammates who paid / were invited ───────────────
export const sendBookingCancellation = functions.firestore
  .document('bookings/{bookingId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const bookingId = context.params['bookingId'] as string;

    if (before['status'] === after['status'] || after['status'] !== 'cancelled') return null;

    const sp = after['splitPayment'] as SplitPayment | undefined;
    if (!sp?.enabled) return null;

    const owner = after['userId'] as string | undefined;
    const recipients = [...(sp.paidPlayers ?? []), ...(sp.invitedFriends ?? [])]
      .filter(uid => uid !== owner);
    if (recipients.length === 0) return null;

    try {
      await sendToUsers(
        recipients,
        { title: 'Booking cancelled', body: `A split booking for ${after['date']} at ${after['startTime']} was cancelled.` },
        { bookingId },
      );
    } catch (error) {
      console.error('Error sending cancellation notice:', error);
    }
    return null;
  });

// ── Hourly: expire unpaid holds (release the slot) + remind unpaid friends ─────
const HOLD_TTL_MS = 24 * 60 * 60 * 1000;

export const sendBookingReminder = functions.pubsub
  .schedule('every 1 hours')
  .onRun(async () => {
    const now = Date.now();
    const snap = await admin.firestore().collection('bookings').where('status', '==', 'hold').get();
    console.log(`Hold scan: ${snap.size} held booking(s).`);

    await Promise.all(snap.docs.map(async (doc) => {
      const b = doc.data();
      const sp = b['splitPayment'] as SplitPayment | undefined;
      const paid = sp?.paidPlayers?.length ?? 0;
      const groupSize = sp?.groupSize ?? 1;
      if (paid >= groupSize) return; // fully paid; the payer's client confirms it

      const createdAt = Date.parse(b['createdAt'] as string) || now;
      const play = new Date(`${b['date']}T${b['startTime']}:00`).getTime();
      const expired = (now - createdAt >= HOLD_TTL_MS) || (play - now <= 0);

      try {
        if (expired) {
          // Release the slot so others can book it.
          await doc.ref.update({ status: 'cancelled' });
          await sendToUsers(
            [b['userId'] as string | undefined],
            { title: 'Hold expired', body: `Your held slot for ${b['date']} at ${b['startTime']} was released — not everyone paid in time.` },
            { bookingId: doc.id },
          );
        } else if (play - now <= HOLD_TTL_MS && !sp?.reminderSent) {
          // Within 24h of play time — remind unpaid invitees once.
          const paidSet = new Set(sp?.paidPlayers ?? []);
          const unpaid = (sp?.invitedFriends ?? []).filter(uid => !paidSet.has(uid));
          if (unpaid.length > 0) {
            await sendToUsers(
              unpaid,
              { title: 'Pay your share ⏳', body: `Confirm the booking for ${b['date']} at ${b['startTime']} before the hold expires.` },
              { bookingId: doc.id },
            );
            await doc.ref.update({ 'splitPayment.reminderSent': true });
          }
        }
      } catch (error) {
        console.error(`Error processing hold ${doc.id}:`, error);
      }
    }));
    return null;
  });
