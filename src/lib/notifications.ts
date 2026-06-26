import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { doc, setDoc, arrayUnion } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { logger } from './logger';

export async function initPushNotifications() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    let permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }
    if (permStatus.receive !== 'granted') {
      logger.warn('User denied push notification permissions');
      return;
    }

    // Android 8+ needs a channel for notifications to show as heads-up with
    // sound. Its id matches the FCM default channel set in AndroidManifest and
    // the channelId the Cloud Functions send on.
    if (Capacitor.getPlatform() === 'android') {
      try {
        await PushNotifications.createChannel({
          id: 'playhub_default',
          name: 'PlayHub Updates',
          description: 'Booking confirmations and updates',
          importance: 5,
          visibility: 1,
          sound: 'default',
        });
      } catch (e) {
        logger.warn('Could not create notification channel:', e);
      }
    }

    // Remove stale listeners first, wire up new ones, then trigger registration.
    // Reversing this order risks the 'registration' event firing before the
    // listener is attached and the token being silently dropped.
    await PushNotifications.removeAllListeners();

    PushNotifications.addListener('registration', async (token) => {
      const user = auth.currentUser;
      if (user) {
        // Stored as an array so Cloud Functions can fan-out to all devices.
        await setDoc(doc(db, 'users', user.uid), {
          fcmTokens: arrayUnion(token.value),
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      }
    });

    PushNotifications.addListener('registrationError', (error: unknown) => {
      logger.error('Push registration error:', error);
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      logger.log('Push received:', notification);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      logger.log('Push action performed:', notification);
    });

    await PushNotifications.register();
  } catch (err) {
    logger.error('Failed to initialize push notifications:', err);
  }
}
