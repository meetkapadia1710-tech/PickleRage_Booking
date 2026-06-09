import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

/**
 * Triggered when a new booking is created.
 * Sends a push notification to the user's registered FCM tokens.
 */
export const sendBookingConfirmation = functions.firestore
  .document('bookings/{bookingId}')
  .onCreate(async (snap, context) => {
    const bookingData = snap.data();
    const userId = bookingData.userId;
    const bookingId = context.params.bookingId;

    if (!userId) {
      console.log('No user ID found for booking', bookingId);
      return null;
    }

    try {
      // Get the user's FCM tokens
      const userDoc = await admin.firestore().collection('users').doc(userId).get();
      const userData = userDoc.data();

      if (!userData || !userData.fcmTokens || userData.fcmTokens.length === 0) {
        console.log('No FCM tokens found for user', userId);
        return null;
      }

      // Construct the message payload
      const payload = {
        notification: {
          title: 'Booking Confirmed! 🎾',
          body: `Your court is locked in for ${bookingData.date} at ${bookingData.startTime}.`,
        },
        data: {
          bookingId: bookingId,
          click_action: 'FLUTTER_NOTIFICATION_CLICK', // standard pattern if migrating to native or PWA
        }
      };

      // Send to all registered tokens for this user
      const response = await admin.messaging().sendToDevice(userData.fcmTokens, payload);
      
      console.log(`Successfully sent ${response.successCount} messages. Failed: ${response.failureCount}`);
      return null;
    } catch (error) {
      console.error('Error sending booking confirmation notification:', error);
      return null;
    }
  });

/**
 * Scheduled job to run every hour.
 * Scans for bookings occurring in the next 24 hours and sends a reminder.
 */
export const sendBookingReminder = functions.pubsub
  .schedule('every 1 hours')
  .onRun(async (context) => {
    // Note: In a production environment, you would query bookings for the exact time window.
    // This is a scaffold.
    console.log('Running scheduled booking reminder scan...');
    return null;
  });
