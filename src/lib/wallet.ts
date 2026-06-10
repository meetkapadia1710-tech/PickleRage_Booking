import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase';
import type { Booking, Venue, Court } from '../types';

// Wallet pass generation is handled server-side to keep the service-account
// private key out of the client bundle. The Cloud Function signs the JWT and
// returns the ready-to-use Google Wallet URL.
export async function getWalletPassUrl(booking: Booking, venue: Venue, court: Court): Promise<string> {
  try {
    const callFn = httpsCallable<object, { url: string }>(
      getFunctions(app),
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
