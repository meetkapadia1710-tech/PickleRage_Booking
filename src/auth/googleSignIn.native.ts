/**
 * ── APK (ANDROID) GOOGLE LOGIN ── runs ONLY inside the Capacitor app ──────
 *
 * The website NEVER loads this file: googleSignIn.ts picks the platform with
 * a dynamic import, so nothing you change here can affect the website.
 *
 * Fixing APK login? Edit this file and the APK-only settings listed in
 * src/auth/README.md (capacitor.config.ts → GoogleAuth, strings.xml,
 * google-services.json, SHA-1 fingerprints). After config changes run:
 *   npm run build && npx cap sync android
 * Do NOT touch googleSignIn.web.ts or Firebase Authorized domains for an
 * APK problem — those are website-only.
 *
 * GOLDEN RULE: serverClientId / server_client_id must ALWAYS be the WEB
 * OAuth client ID (ends in ...8ahn) — never the Android one (...r65h).
 */
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { auth } from '../firebase';
import type { GoogleSignInResult } from './types';

let initialized = false;

/**
 * MUST run before any other GoogleAuth call. The plugin (3.4.0-rc) never
 * initializes itself on Android — signIn()/signOut() hit a null
 * GoogleSignInClient and CRASH THE APK if this is skipped. The client ID
 * comes from strings.xml (server_client_id). Do not remove this to "fix"
 * the website: the website never runs this file.
 */
async function ensureInitialized(): Promise<void> {
  if (initialized) return;
  await GoogleAuth.initialize({
    scopes: ['profile', 'email'],
    grantOfflineAccess: true,
  });
  initialized = true;
}

/** Returns the signed-in user, or null if the user closed the account chooser. */
export async function signInWithGoogleNative(): Promise<GoogleSignInResult | null> {
  await ensureInitialized();

  let googleUser;
  try {
    googleUser = await GoogleAuth.signIn();
  } catch (err: unknown) {
    const mapped = translateNativeError(err);
    if (mapped === null) return null; // user cancelled the account chooser — not an error
    throw mapped;
  }

  const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);
  const result = await signInWithCredential(auth, credential);
  return {
    uid: result.user.uid,
    displayName: result.user.displayName || '',
    email: result.user.email || '',
    photoURL: googleUser.imageUrl || result.user.photoURL || '',
  };
}

/**
 * Clears the native Google session so the next sign-in shows the account
 * chooser again. Failure is non-fatal (there may be no session).
 */
export async function signOutGoogleNative(): Promise<void> {
  try {
    await ensureInitialized(); // signOut also crashes on an uninitialized plugin
    await GoogleAuth.signOut();
  } catch {
    // No active native Google session — nothing to clear.
  }
}

/** Maps Google Play Services errors to messages that say WHAT to fix on the APK side. */
function translateNativeError(err: unknown): Error | null {
  const text = `${(err as { code?: string })?.code ?? ''} ${(err as Error)?.message ?? ''}`;

  // 12501 = SIGN_IN_CANCELLED (user closed the account chooser).
  if (text.includes('12501') || /cancel/i.test(text)) return null;

  // 10 = DEVELOPER_ERROR: the APK's signing SHA-1 is not registered.
  if (/\b10\b|DEVELOPER_ERROR/.test(text)) {
    return new Error(
      'APK login config error (code 10): the SHA-1 of the keystore that signed this APK is not registered. ' +
      'Fix: Firebase Console → Project settings → Android app → add the SHA-1 fingerprint, ' +
      'then download the new google-services.json into android/app/ and rebuild the APK. ' +
      '(APK-only setting — the website is unaffected.)'
    );
  }

  // 7 = NETWORK_ERROR.
  if (/\b7\b|NETWORK_ERROR/.test(text)) {
    return new Error('No connection to Google. Check your internet and try again.');
  }

  // 12500 = SIGN_IN_FAILED: usually a wrong server client ID.
  if (text.includes('12500')) {
    return new Error(
      'APK login config error (code 12500): check that serverClientId in capacitor.config.ts ' +
      'and server_client_id in strings.xml are the WEB OAuth client ID (ends in ...8ahn), ' +
      'then run "npx cap sync android" and rebuild. (APK-only setting — the website is unaffected.)'
    );
  }

  return err instanceof Error ? err : new Error('Sign-in failed. Please try again.');
}
