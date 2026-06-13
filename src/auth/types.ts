/**
 * Shared shape returned by BOTH Google sign-in implementations.
 * This is the only thing the website and APK flows have in common.
 * Keep platform-specific logic OUT of this file.
 */
export interface GoogleSignInResult {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
}
