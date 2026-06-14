"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendBookingReminder = exports.onBookingUpdate = exports.sendBookingConfirmation = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const CHANNEL_ID = 'playhub_default';
/**
 * Send a push to every FCM token owned by the given users, then prune any tokens
 * the messaging service reports as invalid. Supports both the `fcmTokens` array
 * and the legacy singular `fcmToken` string.
 */
async function sendToUsers(userIds, notification, data = {}) {
    const ids = [...new Set(userIds)].filter((id) => !!id);
    if (ids.length === 0)
        return;
    const tokenOwners = [];
    await Promise.all(ids.map(async (uid) => {
        const snap = await admin.firestore().collection('users').doc(uid).get();
        const u = snap.data();
        if (!u)
            return;
        if (Array.isArray(u['fcmTokens'])) {
            u['fcmTokens'].forEach(t => { if (t)
                tokenOwners.push({ token: t, uid }); });
        }
        else if (typeof u['fcmToken'] === 'string' && u['fcmToken']) {
            tokenOwners.push({ token: u['fcmToken'], uid });
        }
    }));
    if (tokenOwners.length === 0)
        return;
    const tokens = tokenOwners.map(t => t.token);
    const res = await admin.messaging().sendEachForMulticast({
        tokens,
        notification,
        data,
        // High priority + channel so Android shows a heads-up notification.
        android: {
            priority: 'high',
            notification: { channelId: CHANNEL_ID, sound: 'default' },
        },
    });
    console.log(`Sent: ${res.successCount}, Failed: ${res.failureCount}`);
    // Prune invalid tokens, grouped per owner.
    const staleByUser = new Map();
    res.responses.forEach((r, i) => {
        var _a;
        if (!r.success) {
            const { token, uid } = tokenOwners[i];
            staleByUser.set(uid, [...((_a = staleByUser.get(uid)) !== null && _a !== void 0 ? _a : []), token]);
        }
    });
    await Promise.all([...staleByUser.entries()].map(([uid, stale]) => admin.firestore().collection('users').doc(uid).update({
        fcmTokens: admin.firestore.FieldValue.arrayRemove(...stale),
    }).catch(() => undefined)));
}
async function getUserName(uid) {
    var _a;
    const snap = await admin.firestore().collection('users').doc(uid).get();
    return (_a = snap.data()) === null || _a === void 0 ? void 0 : _a['displayName'];
}
// ── On booking create: confirm to booker + invite split friends ───────────────
exports.sendBookingConfirmation = functions.firestore
    .document('bookings/{bookingId}')
    .onCreate(async (snap, context) => {
    const b = snap.data();
    const bookingId = context.params['bookingId'];
    const userId = b['userId'];
    const date = b['date'];
    const startTime = b['startTime'];
    const status = b['status'];
    try {
        // Booker: "confirmed" vs "on hold" depending on status.
        if (userId) {
            const msg = status === 'hold'
                ? { title: 'Slot on hold ⏸', body: `Your slot for ${date} at ${startTime} is held — it confirms once everyone pays.` }
                : { title: 'Booking Confirmed! 🎾', body: `Your court is locked in for ${date} at ${startTime}.` };
            await sendToUsers([userId], msg, { bookingId });
        }
        // Invited split friends: ask them to pay their share.
        const sp = b['splitPayment'];
        if ((sp === null || sp === void 0 ? void 0 : sp.enabled) && Array.isArray(sp.invitedFriends) && sp.invitedFriends.length > 0) {
            await sendToUsers(sp.invitedFriends, { title: "You're invited to split a booking 🎾", body: `Pay your share for ${date} at ${startTime}.` }, { bookingId });
        }
    }
    catch (error) {
        console.error('Error sending booking confirmation:', error);
    }
    return null;
});
// ── On booking update: notify on every important change ───────────────────────
// Covers: cancellation, a teammate paying their share, and the final all-paid
// confirmation. (Hold expiry is handled by the scheduled job, which flips status
// to 'cancelled' and therefore also triggers the cancellation branch here.)
exports.onBookingUpdate = functions.firestore
    .document('bookings/{bookingId}')
    .onUpdate(async (change, context) => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const before = change.before.data();
    const after = change.after.data();
    const bookingId = context.params['bookingId'];
    const date = after['date'];
    const startTime = after['startTime'];
    const owner = after['userId'];
    const spBefore = before['splitPayment'];
    const spAfter = after['splitPayment'];
    try {
        // 1) Cancellation → tell every teammate (the owner who cancelled is excluded).
        if (before['status'] !== 'cancelled' && after['status'] === 'cancelled') {
            if (spAfter === null || spAfter === void 0 ? void 0 : spAfter.enabled) {
                const recipients = [...((_a = spAfter.paidPlayers) !== null && _a !== void 0 ? _a : []), ...((_b = spAfter.invitedFriends) !== null && _b !== void 0 ? _b : [])]
                    .filter(uid => uid !== owner);
                await sendToUsers(recipients, { title: 'Booking cancelled', body: `The split booking for ${date} at ${startTime} was cancelled.` }, { bookingId, type: 'cancelled' });
            }
            return null;
        }
        // 2) A new teammate paid their share.
        if (spAfter === null || spAfter === void 0 ? void 0 : spAfter.enabled) {
            const beforePaid = new Set((_c = spBefore === null || spBefore === void 0 ? void 0 : spBefore.paidPlayers) !== null && _c !== void 0 ? _c : []);
            const afterPaid = (_d = spAfter.paidPlayers) !== null && _d !== void 0 ? _d : [];
            const newPayers = afterPaid.filter(uid => !beforePaid.has(uid));
            if (newPayers.length > 0) {
                const groupSize = (_e = spAfter.groupSize) !== null && _e !== void 0 ? _e : 1;
                const paidCount = afterPaid.length;
                const allPaid = paidCount >= groupSize || after['status'] === 'confirmed';
                if (allPaid) {
                    // Final payment → confirm to everyone involved.
                    const everyone = [owner, ...afterPaid, ...((_f = spAfter.invitedFriends) !== null && _f !== void 0 ? _f : [])];
                    await sendToUsers(everyone, { title: 'All paid — booking confirmed! 🎉', body: `Your court for ${date} at ${startTime} is locked in.` }, { bookingId, type: 'confirmed' });
                }
                else {
                    // Partial progress → notify the owner + teammates who already paid.
                    const payerUid = newPayers[0];
                    const payerName = ((_h = (_g = spAfter.payerDetails) === null || _g === void 0 ? void 0 : _g.find(p => p.uid === payerUid)) === null || _h === void 0 ? void 0 : _h.name)
                        || (await getUserName(payerUid))
                        || 'A friend';
                    const recipients = [owner, ...afterPaid].filter(uid => uid && !newPayers.includes(uid));
                    await sendToUsers(recipients, { title: 'Share paid 💸', body: `${payerName} paid their share (${paidCount}/${groupSize}) for ${date} at ${startTime}.` }, { bookingId, type: 'payment' });
                }
            }
        }
    }
    catch (error) {
        console.error('Error in onBookingUpdate:', error);
    }
    return null;
});
// ── Hourly: expire unpaid holds (release the slot) + remind unpaid friends ─────
const HOLD_TTL_MS = 24 * 60 * 60 * 1000;
exports.sendBookingReminder = functions.pubsub
    .schedule('every 1 hours')
    .onRun(async () => {
    const now = Date.now();
    const snap = await admin.firestore().collection('bookings').where('status', '==', 'hold').get();
    console.log(`Hold scan: ${snap.size} held booking(s).`);
    await Promise.all(snap.docs.map(async (doc) => {
        var _a, _b, _c, _d, _e;
        const b = doc.data();
        const sp = b['splitPayment'];
        const paid = (_b = (_a = sp === null || sp === void 0 ? void 0 : sp.paidPlayers) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0;
        const groupSize = (_c = sp === null || sp === void 0 ? void 0 : sp.groupSize) !== null && _c !== void 0 ? _c : 1;
        if (paid >= groupSize)
            return; // fully paid; the payer's client confirms it
        const createdAt = Date.parse(b['createdAt']) || now;
        const play = new Date(`${b['date']}T${b['startTime']}:00`).getTime();
        const expired = (now - createdAt >= HOLD_TTL_MS) || (play - now <= 0);
        try {
            if (expired) {
                // Release the slot so others can book it.
                await doc.ref.update({ status: 'cancelled' });
                await sendToUsers([b['userId']], { title: 'Hold expired', body: `Your held slot for ${b['date']} at ${b['startTime']} was released — not everyone paid in time.` }, { bookingId: doc.id });
            }
            else if (play - now <= HOLD_TTL_MS && !(sp === null || sp === void 0 ? void 0 : sp.reminderSent)) {
                // Within 24h of play time — remind unpaid invitees once.
                const paidSet = new Set((_d = sp === null || sp === void 0 ? void 0 : sp.paidPlayers) !== null && _d !== void 0 ? _d : []);
                const unpaid = ((_e = sp === null || sp === void 0 ? void 0 : sp.invitedFriends) !== null && _e !== void 0 ? _e : []).filter(uid => !paidSet.has(uid));
                if (unpaid.length > 0) {
                    await sendToUsers(unpaid, { title: 'Pay your share ⏳', body: `Confirm the booking for ${b['date']} at ${b['startTime']} before the hold expires.` }, { bookingId: doc.id });
                    await doc.ref.update({ 'splitPayment.reminderSent': true });
                }
            }
        }
        catch (error) {
            console.error(`Error processing hold ${doc.id}:`, error);
        }
    }));
    return null;
});
//# sourceMappingURL=notifications.js.map