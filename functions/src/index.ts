import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import * as crypto from 'crypto';

admin.initializeApp();

export * from './notifications';
export * from './razorpay';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function b64url(str: string): string {
  return Buffer.from(str).toString('base64url');
}

function buildWalletPass(
  bookingId: string,
  date: string,
  startTime: string,
  venueName: string,
  courtName: string,
  price: number,
  issuerId: string,
): object {
  const classId = 'playhub_court_booking';
  return {
    genericClasses: [{ id: `${issuerId}.${classId}` }],
    genericObjects: [{
      id: `${issuerId}.${bookingId}`,
      classId: `${issuerId}.${classId}`,
      state: 'ACTIVE',
      cardTitle:  { defaultValue: { language: 'en-US', value: 'PlayHub Court Booking' } },
      header:     { defaultValue: { language: 'en-US', value: venueName } },
      subheader:  { defaultValue: { language: 'en-US', value: courtName } },
      logo: {
        // Update this URL once the app logo is deployed to Firebase Hosting.
        sourceUri: { uri: 'https://picklerage-booking.web.app/favicon.svg' },
      },
      barcode: { type: 'QR_CODE', value: bookingId, alternateText: bookingId },
      textModulesData: [
        { id: 'date_time', header: 'DATE & TIME', body: `${date} • ${startTime}` },
        { id: 'price',     header: 'PRICE',       body: `₹${price}.00` },
      ],
    }],
  };
}

// ─── Wallet Pass URL (server-side RS256-signed JWT) ───────────────────────────
//
// Configure secrets before deploying:
//   firebase functions:config:set wallet.issuer_id="..." \
//     wallet.client_email="..." wallet.private_key="..."
//
// The function falls back to an unsigned JWT if config is absent, which allows
// development/testing without credentials.

export const generateWalletPassUrl = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  }

  const { bookingId, date, startTime, venueName, courtName, price } = data as {
    bookingId: string; date: string; startTime: string;
    venueName: string; courtName: string; price: number;
  };

  const walletCfg = (functions.config() as Record<string, Record<string, string>>)['wallet'] ?? {};
  const issuerId    = walletCfg['issuer_id']    ?? '';
  const clientEmail = walletCfg['client_email'] ?? '';
  const privateKey  = (walletCfg['private_key'] ?? '').replace(/\\n/g, '\n');

  const passObj = buildWalletPass(
    bookingId, date, startTime, venueName, courtName, price,
    issuerId || 'UNCONFIGURED',
  );

  if (issuerId && clientEmail && privateKey) {
    try {
      const header  = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
      const payload = b64url(JSON.stringify({
        iss: clientEmail, aud: 'google', typ: 'savetowallet',
        iat: Math.floor(Date.now() / 1000),
        payload: passObj,
      }));
      const signer = crypto.createSign('RSA-SHA256');
      signer.update(`${header}.${payload}`);
      const sig = signer.sign(privateKey, 'base64url');
      return { url: `https://pay.google.com/gp/v/save/${header}.${payload}.${sig}` };
    } catch (err) {
      console.warn('Wallet JWT signing failed, using unsigned fallback:', err);
    }
  }

  // Unsigned fallback (no private-key config required).
  const h = b64url(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const p = b64url(JSON.stringify({
    iss: clientEmail || 'playhub-service-account@picklerage-booking.iam.gserviceaccount.com',
    aud: 'google', typ: 'savetowallet',
    iat: Math.floor(Date.now() / 1000),
    payload: passObj,
  }));
  return { url: `https://pay.google.com/gp/v/save/${h}.${p}.` };
});
