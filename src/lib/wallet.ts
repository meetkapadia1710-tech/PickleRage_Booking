import type { Booking, Venue, Court } from '../types';

function base64UrlEncode(str: string): string {
  try {
    const base64 = btoa(unescape(encodeURIComponent(str)));
    return base64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  } catch (err) {
    console.error('Base64 URL encoding failed:', err);
    return '';
  }
}

function base64UrlEncodeFromBuffer(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\\n/g, '')
    .replace(/[^A-Za-z0-9+/=]/g, '');
  const binaryStr = atob(b64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes.buffer;
}

async function signJwtWebCrypto(payload: object, privateKeyPem: string, clientEmail: string): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' };
  const headerEncoded = base64UrlEncode(JSON.stringify(header));
  const payloadWithIss = {
    ...payload,
    iss: clientEmail,
    aud: 'google',
    typ: 'savetowallet',
    iat: Math.floor(Date.now() / 1000),
  };
  const payloadEncoded = base64UrlEncode(JSON.stringify(payloadWithIss));
  const signTarget = `${headerEncoded}.${payloadEncoded}`;

  const key = await window.crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(privateKeyPem),
    { name: 'RSASSA-PKCS1-v1_5', hash: { name: 'SHA-256' } },
    false,
    ['sign'],
  );

  const signature = await window.crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(signTarget),
  );

  return `${signTarget}.${base64UrlEncodeFromBuffer(signature)}`;
}

// Environment variables injected by Vite at build time
const VITE_WALLET_ISSUER_ID    = import.meta.env.VITE_WALLET_ISSUER_ID;
const VITE_WALLET_CLIENT_EMAIL = import.meta.env.VITE_WALLET_CLIENT_EMAIL;
const VITE_WALLET_PRIVATE_KEY  = import.meta.env.VITE_WALLET_PRIVATE_KEY;

function buildPassObject(booking: Booking, venue: Venue, court: Court, issuerId: string) {
  const classId = 'playhub_court_booking';
  return {
    genericClasses: [{ id: `${issuerId}.${classId}` }],
    genericObjects: [{
      id: `${issuerId}.${booking.id}`,
      classId: `${issuerId}.${classId}`,
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
  };
}

export function generateGoogleWalletUrl(booking: Booking, venue: Venue, court: Court): string {
  const issuerId = VITE_WALLET_ISSUER_ID || '3388000000023155636';
  const header = { alg: 'none', typ: 'JWT' };
  const payload = {
    iss: 'playhub-service-account@picklerage-booking.iam.gserviceaccount.com',
    aud: 'google',
    typ: 'savetowallet',
    iat: Math.floor(Date.now() / 1000),
    payload: buildPassObject(booking, venue, court, issuerId),
  };
  const h = base64UrlEncode(JSON.stringify(header));
  const p = base64UrlEncode(JSON.stringify(payload));
  return `https://pay.google.com/gp/v/save/${h}.${p}.`;
}

export async function getWalletPassUrl(booking: Booking, venue: Venue, court: Court): Promise<string> {
  const privateKey = VITE_WALLET_PRIVATE_KEY ? VITE_WALLET_PRIVATE_KEY.replace(/\\n/g, '\n') : '';

  if (privateKey && VITE_WALLET_CLIENT_EMAIL) {
    try {
      const issuerId = VITE_WALLET_ISSUER_ID || '3388000000023155636';
      const signedJwt = await signJwtWebCrypto(
        { payload: buildPassObject(booking, venue, court, issuerId) },
        privateKey,
        VITE_WALLET_CLIENT_EMAIL,
      );
      return `https://pay.google.com/gp/v/save/${signedJwt}`;
    } catch (err) {
      console.warn('Client-side wallet signature failed, using unsigned URL:', err);
    }
  }

  return generateGoogleWalletUrl(booking, venue, court);
}
