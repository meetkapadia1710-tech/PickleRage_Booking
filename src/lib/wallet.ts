import type { Booking, Venue, Court } from '../types';

/**
 * Base64URL encodes a string.
 */
function base64UrlEncode(str: string): string {
  try {
    const base64 = btoa(unescape(encodeURIComponent(str)));
    return base64
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  } catch (err) {
    console.error("Base64 URL encoding failed:", err);
    return "";
  }
}

/**
 * Generates an Add to Google Wallet URL for a confirmed court booking.
 * 
 * NOTE: For production, Google Wallet requires the JWT payload to be signed
 * using a GCP Service Account private key (RS256 signature). This utility 
 * generates an unsigned JWT (alg: "none") to demonstrate structural formatting
 * and flow. Once credentials are set up, this signing process should run 
 * inside your backend/Cloud Functions.
 */
export function generateGoogleWalletUrl(booking: Booking, venue: Venue, court: Court): string {
  const issuerId = "3388000000022233344"; // Placeholder Google Pay Issuer ID
  const classId = "playhub_court_booking";

  const header = {
    alg: "none",
    typ: "JWT"
  };

  const payload = {
    iss: "playhub-service-account@picklerage-booking.iam.gserviceaccount.com",
    aud: "google",
    typ: "savetowallet",
    iat: Math.floor(Date.now() / 1000),
    payload: {
      genericObjects: [
        {
          id: `${issuerId}.${booking.id}`,
          classId: `${issuerId}.${classId}`,
          state: "ACTIVE",
          cardTitle: {
            defaultValue: {
              language: "en-US",
              value: "PlayHub Court Booking"
            }
          },
          header: {
            defaultValue: {
              language: "en-US",
              value: venue.name
            }
          },
          subheader: {
            defaultValue: {
              language: "en-US",
              value: court.name
            }
          },
          logo: {
            sourceUri: {
              uri: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80"
            }
          },
          barcode: {
            type: "QR_CODE",
            value: booking.id,
            alternateText: booking.id
          },
          textModulesData: [
            {
              id: "date_time",
              header: "DATE & TIME",
              body: `${booking.date} • ${booking.startTime}`
            },
            {
              id: "price",
              header: "PRICE",
              body: `₹${venue.price}.00`
            }
          ]
        }
      ]
    }
  };

  const headerEncoded = base64UrlEncode(JSON.stringify(header));
  const payloadEncoded = base64UrlEncode(JSON.stringify(payload));
  
  // A JWT with alg "none" has an empty signature block but still ends with a dot.
  const jwt = `${headerEncoded}.${payloadEncoded}.`;

  return `https://pay.google.com/gp/v/save/${jwt}`;
}
