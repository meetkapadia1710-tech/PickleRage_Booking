/**
 * ── APK-ONLY: Android back gesture / back button support ──────────────────
 *
 * Without a 'backButton' listener, Capacitor's default for the system back
 * action is to CLOSE THE APP. This module makes back behave like a native
 * app: navigate back through screens, and background (minimize) the app
 * when already at a root screen.
 *
 * The website never loads this file — App.tsx only imports it via a dynamic
 * import behind Capacitor.isNativePlatform().
 */
import { App as CapacitorApp } from '@capacitor/app';
import { closeTopOverlay } from '../lib/backClose';

// Back from these screens should background the app (like native apps do),
// never exit or bounce to the login flow behind them.
const ROOT_PATHS = new Set(['/', '/login', '/home', '/complete-profile']);

export async function registerAndroidBackButton(
  goBack: () => void,
  goHome: () => void,
): Promise<() => void> {
  const handle = await CapacitorApp.addListener('backButton', ({ canGoBack }) => {
    // An open sheet/dialog consumes the gesture: close it, stay on the page.
    if (closeTopOverlay()) {
      return;
    }
    if (ROOT_PATHS.has(window.location.pathname)) {
      CapacitorApp.minimizeApp();
    } else if (canGoBack) {
      goBack();
    } else {
      // Opened deep (e.g. from a notification) with no history behind us.
      goHome();
    }
  });
  return () => {
    handle.remove();
  };
}
