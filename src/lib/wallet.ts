import { httpsCallable } from 'firebase/functions';
import { functions } from './functions';
import { logger } from './logger';
import type { Booking, Venue, Court } from '../types';

// Wallet pass generation is handled server-side to keep the service-account
// private key out of the client bundle. The Cloud Function signs the JWT and
// returns the ready-to-use Google Wallet URL.
export async function getWalletPassUrl(booking: Booking, venue: Venue, court: Court): Promise<string> {
  try {
    const callFn = httpsCallable<object, { url: string }>(functions, 'generateWalletPassUrl');
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
    logger.warn('Wallet pass generation failed:', err);
    return '';
  }
}
