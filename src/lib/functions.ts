/**
 * Shared Firebase Functions instance.
 *
 * Both razorpay.ts and wallet.ts import from here so that
 * `connectFunctionsEmulator` is called exactly once per page load.
 * Previously each module called getFunctions(app) independently and
 * also connected the emulator — calling connectFunctionsEmulator twice
 * on the same instance causes SDK warnings and unpredictable behaviour.
 */
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { app } from '../firebase';

export const functions = getFunctions(app);

// Emulator is for local development only. We deliberately exclude 192.168.x
// so that production devices on the same Wi-Fi as a developer do NOT
// accidentally hit the local emulator.
if (
  import.meta.env.DEV &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1')
) {
  connectFunctionsEmulator(functions, 'localhost', 5002);
}
