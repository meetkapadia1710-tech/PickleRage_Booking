/**
 * ── WEBSITE GOOGLE LOGIN ── runs ONLY in the browser ──────────────────────
 *
 * The APK NEVER loads this file: googleSignIn.ts picks the platform with a
 * dynamic import, so nothing you change here can affect the APK.
 *
 * Fixing website login? Edit this file and the website-only settings listed
 * in src/auth/README.md (Firebase Authorized domains, web OAuth client).
 * Do NOT touch googleSignIn.native.ts, capacitor.config.ts, strings.xml or
 * google-services.json for a website problem — those are APK-only.
 */
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../firebase';
import type { GoogleSignInResult } from './types';

/** Returns the signed-in user, or null if the user closed the popup. */
export async function signInWithGoogleWeb(): Promise<GoogleSignInResult | null> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    const result = await signInWithPopup(auth, provider);
    return {
      uid: result.user.uid,
      displayName: result.user.displayName || '',
      email: result.user.email || '',
      photoURL: result.user.photoURL || '',
    };
  } catch (err: unknown) {
    const mapped = translateWebError(err);
    if (mapped === null) return null; // user closed the popup — not an error
    throw mapped;
  }
}

/** Maps Firebase popup errors to messages that say WHAT to fix on the WEBSITE side. */
function translateWebError(err: unknown): Error | null {
  const code = (err as { code?: string })?.code ?? '';

  // User closed/cancelled the popup — not an error.
  if (
    code === 'auth/popup-closed-by-user' ||
    code === 'auth/cancelled-popup-request' ||
    code === 'auth/user-cancelled'
  ) {
    return null;
  }

  if (code === 'auth/unauthorized-domain') {
    return new Error(
      'Website login config error: this domain is not authorized. ' +
      'Fix: Firebase Console → Authentication → Settings → Authorized domains. ' +
      '(Website-only setting — the APK is unaffected.)'
    );
  }

  if (code === 'auth/popup-blocked') {
    return new Error('The browser blocked the sign-in popup. Allow popups for this site and try again.');
  }

  if (code === 'auth/operation-not-allowed') {
    return new Error(
      'Google sign-in is disabled for this Firebase project. ' +
      'Fix: Firebase Console → Authentication → Sign-in method → enable Google.'
    );
  }

  return err instanceof Error ? err : new Error('Sign-in failed. Please try again.');
}
