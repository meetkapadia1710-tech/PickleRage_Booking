import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { doc, setDoc, arrayUnion } from 'firebase/firestore';
import { db, auth } from '../firebase';

export async function initPushNotifications() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    let permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }
    if (permStatus.receive !== 'granted') {
      console.warn('User denied push notification permissions');
      return;
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
      console.error('Push registration error:', error);
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push received:', notification);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Push action performed:', notification);
    });

    await PushNotifications.register();
  } catch (err) {
    console.error('Failed to initialize push notifications:', err);
  }
}
