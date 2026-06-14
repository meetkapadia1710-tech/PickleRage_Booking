import { Capacitor } from '@capacitor/core';

/**
 * Canonical public origin of the deployed web app. Used to build shareable
 * links (split-payment invites, venue shares).
 *
 * Inside the Capacitor WebView `window.location.origin` is "http://localhost",
 * which is useless once shared. On the deployed web app the real origin is
 * already correct, so we only override it for native / localhost contexts.
 */
export const PUBLIC_APP_URL = 'https://pickle-rage-booking-pi.vercel.app';

/** Origin to use when generating links meant to be opened by other people. */
export function publicAppOrigin(): string {
  if (Capacitor.isNativePlatform()) return PUBLIC_APP_URL;
  const { origin } = window.location;
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) return PUBLIC_APP_URL;
  return origin;
}

/** Absolute URL for a split-payment invite link. */
export function splitPaymentUrl(token: string): string {
  return `${publicAppOrigin()}/split/${token}`;
}
