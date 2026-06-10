import type { Booking, Venue, Court } from '../types';

function base64UrlEncode(str: string): string {
  try {
    const base64 = btoa(unescape(encodeURIComponent(str)));
    return base64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  } catch {
    return '';
  }
}

const ISSUER_ID = import.meta.env.VITE_WALLET_ISSUER_ID || '3388000000023155636';
const CLASS_ID = 'playhub_court_booking';

function buildPassPayload(booking: Booking, venue: Venue, court: Court) {
  return {
    iss: 'playhub@playhub.app',
    aud: 'google',
    typ: 'savetowallet',
    iat: Math.floor(Date.now() / 1000),
    payload: {
      genericClasses: [{ id: `${ISSUER_ID}.${CLASS_ID}` }],
      genericObjects: [{
        id: `${ISSUER_ID}.${booking.id}`,
        classId: `${ISSUER_ID}.${CLASS_ID}`,
        state: 'ACTIVE',
        cardTitle:  { defaultValue: { language: 'en-US', value: 'PlayHub Court Booking' } },
        header:     { defaultValue: { language: 'en-US', value: venue.name } },
        subheader:  { defaultValue: { language: 'en-US', value: court.name } },
        logo: {
          sourceUri: { uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80' },
        },
        barcode: { type: 'QR_CODE', value: booking.id, alternateText: booking.id },
        textModulesData: [
          { id: 'date_time', header: 'DATE & TIME', body: `${booking.date} • ${booking.startTime}` },
          { id: 'price',     header: 'PRICE',       body: `₹${venue.price}.00` },
        ],
      }],
    },
  };
}

// Builds an unsigned ("alg: none") Google Wallet save URL.
// Unsigned passes work for personal/dev use. For production-verified passes,
// signing must happen in a server-side Cloud Function — never in the browser.
export function generateGoogleWalletUrl(booking: Booking, venue: Venue, court: Court): string {
  const header = { alg: 'none', typ: 'JWT' };
  const h = base64UrlEncode(JSON.stringify(header));
  const p = base64UrlEncode(JSON.stringify(buildPassPayload(booking, venue, court)));
  return `https://pay.google.com/gp/v/save/${h}.${p}.`;
}

// Async wrapper kept for call-site backward compatibility.
export async function getWalletPassUrl(booking: Booking, venue: Venue, court: Court): Promise<string> {
  return generateGoogleWalletUrl(booking, venue, court);
}
