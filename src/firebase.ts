import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAAmtxcGciEF3-dSviuCuWM18qEllxAeug",
  authDomain: "picklerage-booking.firebaseapp.com",
  projectId: "picklerage-booking",
  storageBucket: "picklerage-booking.firebasestorage.app",
  messagingSenderId: "21785967034",
  appId: "1:21785967034:web:49f2d11c7d44d551198583",
  measurementId: "G-VDEKNH5N2P"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
