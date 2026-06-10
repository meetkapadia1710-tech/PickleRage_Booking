import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { doc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';

export async function initPushNotifications() {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      console.warn('User denied push notification permissions');
      return;
    }

    // Register with Google to receive FCM tokens
    await PushNotifications.register();

    // Remove old listeners to prevent duplicates
    await PushNotifications.removeAllListeners();

    PushNotifications.addListener('registration', async (token) => {
      console.log('Push registration success, token: ' + token.value);
      
      const user = auth.currentUser;
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, {
          fcmToken: token.value,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }
    });

    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('Error on registration: ', error);
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push received: ', notification);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Push action performed: ', notification);
    });

  } catch (err) {
    console.error('Failed to initialize push notifications', err);
  }
}
