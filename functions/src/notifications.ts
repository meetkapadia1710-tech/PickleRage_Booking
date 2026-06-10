import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const sendBookingConfirmation = functions.firestore
  .document('bookings/{bookingId}')
  .onCreate(async (snap, context) => {
    const bookingData = snap.data();
    const userId  = bookingData['userId']  as string | undefined;
    const bookingId = context.params['bookingId'] as string;

    if (!userId) {
      console.log('No user ID found for booking', bookingId);
      return null;
    }

    try {
      const userDoc  = await admin.firestore().collection('users').doc(userId).get();
      const userData = userDoc.data();

      if (!userData) {
        console.log('User document not found for', userId);
        return null;
      }

      // Support both the current array field and the legacy singular string field.
      let tokens: string[] = [];
      if (Array.isArray(userData['fcmTokens'])) {
        tokens = userData['fcmTokens'] as string[];
      } else if (typeof userData['fcmToken'] === 'string' && userData['fcmToken']) {
        tokens = [userData['fcmToken'] as string];
      }

      if (tokens.length === 0) {
        console.log('No FCM tokens found for user', userId);
        return null;
      }

      const response = await admin.messaging().sendEachForMulticast({
        tokens,
        notification: {
          title: 'Booking Confirmed! 🎾',
          body: `Your court is locked in for ${bookingData['date'] as string} at ${bookingData['startTime'] as string}.`,
        },
        data: { bookingId },
      });

      console.log(`Sent: ${response.successCount}, Failed: ${response.failureCount}`);

      // Prune any tokens that were reported as invalid to keep the list clean.
      const staleTokens = response.responses
        .map((r, i) => (!r.success ? tokens[i] : null))
        .filter((t): t is string => t !== null);
      if (staleTokens.length > 0) {
        await admin.firestore().collection('users').doc(userId).update({
          fcmTokens: admin.firestore.FieldValue.arrayRemove(...staleTokens),
        });
      }

      return null;
    } catch (error) {
      console.error('Error sending booking confirmation:', error);
      return null;
    }
  });

export const sendBookingReminder = functions.pubsub
  .schedule('every 1 hours')
  .onRun(async () => {
    console.log('Running scheduled booking reminder scan...');
    return null;
  });
