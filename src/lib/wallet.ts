import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';
import { app } from '../firebase';
import type { Booking, Venue, Court } from '../types';

const fns = getFunctions(app);
if (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname.startsWith('192.168.') ||
  import.meta.env.DEV
) {
  const host = window.location.hostname === 'localhost' ? 'localhost' : (window.location.hostname || 'localhost');
  connectFunctionsEmulator(fns, host, 5002);
}

// Wallet pass generation is handled server-side to keep the service-account
// private key out of the client bundle. The Cloud Function signs the JWT and
// returns the ready-to-use Google Wallet URL.
export async function getWalletPassUrl(booking: Booking, venue: Venue, court: Court): Promise<string> {
  try {
    const callFn = httpsCallable<object, { url: string }>(
      fns,
      'generateWalletPassUrl',
    );
    const { data } = await callFn({
      bookingId: booking.id,
      date:      booking.date,
      startTime: booking.startTime,
      venueName: venue.name,
      courtName: court.name,
      price:     venue.price,
    });
    return data.url;
  } catch (err) {
    console.warn('Wallet pass generation failed:', err);
    return '';
  }
}
