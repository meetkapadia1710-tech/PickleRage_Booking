import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const CHANNEL_ID = 'playhub_default';

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
  const res = await admin.messaging().sendEachForMulticast({
    tokens,
    notification,
    data,
    android: {
      priority: 'high',
      notification: { channelId: CHANNEL_ID, sound: 'default' },
    },
  });
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

// ── On booking create: send confirmation to booker ────────────────────────────
export const sendBookingConfirmation = functions.firestore
  .document('bookings/{bookingId}')
  .onCreate(async (snap, context) => {
    const b = snap.data();
    const bookingId = context.params['bookingId'] as string;
    const userId = b['userId'] as string | undefined;
    const date = b['date'] as string;
    const startTime = b['startTime'] as string;

    try {
      if (userId) {
        await sendToUsers(
          [userId],
          { title: 'Booking Confirmed! 🎾', body: `Your court is locked in for ${date} at ${startTime}.` },
          { bookingId },
        );
      }
    } catch (error) {
      console.error('Error sending booking confirmation:', error);
    }
    return null;
  });

// ── On booking update: notify booker of cancellation ─────────────────────────
export const onBookingUpdate = functions.firestore
  .document('bookings/{bookingId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const bookingId = context.params['bookingId'] as string;
    const date = after['date'] as string;
    const startTime = after['startTime'] as string;
    const owner = after['userId'] as string | undefined;

    try {
      if (before['status'] !== 'cancelled' && after['status'] === 'cancelled') {
        await sendToUsers(
          [owner],
          { title: 'Booking Cancelled', body: `Your booking for ${date} at ${startTime} has been cancelled.` },
          { bookingId, type: 'cancelled' },
        );
      }
    } catch (error) {
      console.error('Error in onBookingUpdate:', error);
    }
    return null;
  });
