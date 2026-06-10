/**
 * ── GOOGLE LOGIN DISPATCHER ── the ONLY auth file pages may import ────────
 *
 * Picks the platform implementation at runtime with a dynamic import():
 *   - Website → googleSignIn.web.ts    (Firebase popup)
 *   - APK     → googleSignIn.native.ts (native Google account chooser)
 *
 * Because the import is dynamic, the website never even loads the native
 * module's code and the APK never loads the web module's code. Fixing one
 * platform CANNOT break the other. See src/auth/README.md for the
 * per-platform fix workflow.
 *
 * This file must stay platform-neutral: no popup logic, no plugin calls.
 */
import { Capacitor } from '@capacitor/core';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import type { GoogleSignInResult } from './types';

/**
 * Signs in with Google on whichever platform we're running on.
 * Returns the user, or null if they cancelled (not an error).
 * Throws an Error whose message says which platform's config to fix.
 */
export async function signInWithGoogle(): Promise<GoogleSignInResult | null> {
  const user = Capacitor.isNativePlatform()
    ? await (await import('./googleSignIn.native')).signInWithGoogleNative()
    : await (await import('./googleSignIn.web')).signInWithGoogleWeb();

  if (user) await ensureUserDoc(user);
  return user;
}

/**
 * Signs the user out everywhere. On the APK this also clears the native
 * Google session so the account chooser appears on the next sign-in.
 */
export async function signOutUser(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await (await import('./googleSignIn.native')).signOutGoogleNative();
  }
  await auth.signOut();
}

/** Platform-neutral: creates the Firestore user doc for first-time users. */
async function ensureUserDoc(user: GoogleSignInResult): Promise<void> {
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      displayName: user.displayName || 'Player',
      email: user.email,
      photoURL: user.photoURL,
      createdAt: new Date().toISOString(),
    });
  }
}
