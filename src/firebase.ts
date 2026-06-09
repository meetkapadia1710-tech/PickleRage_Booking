import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  // TODO: Replace with actual Firebase config
  apiKey: "placeholder-api-key",
  authDomain: "playhub-demo.firebaseapp.com",
  projectId: "playhub-demo",
  storageBucket: "playhub-demo.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
