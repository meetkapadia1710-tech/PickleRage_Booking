import * as functions from 'firebase-functions';
import * as crypto from 'crypto';
import Razorpay from 'razorpay';

// Credentials come from functions/.env (loaded by the Firebase CLI). The Key
// Secret stays server-side and is never returned to the client.
const KEY_ID = process.env.RAZORPAY_KEY_ID;
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

function getClient(): Razorpay {
  if (!KEY_ID || !KEY_SECRET) {
    throw new functions.https.HttpsError('failed-precondition', 'Razorpay keys are not configured.');
  }
  return new Razorpay({ key_id: KEY_ID, key_secret: KEY_SECRET });
}

// ── Create an order (amount is in paise) ──────────────────────────────────────
export const createRazorpayOrder = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to pay.');
  }

  const amount = Math.round(Number(data?.amount));
  const currency = (data?.currency as string) || 'INR';
  const receipt = (data?.receipt as string) || `rcpt_${Date.now()}`;

  if (!Number.isFinite(amount) || amount < 100) {
    throw new functions.https.HttpsError('invalid-argument', 'Amount must be at least 100 paise (₹1).');
  }

  try {
    const order = await getClient().orders.create({ amount, currency, receipt });
    return { order_id: order.id, amount: order.amount, currency: order.currency, key_id: KEY_ID };
  } catch (err) {
    console.error('Razorpay order creation failed:', err);
    throw new functions.https.HttpsError('internal', 'Could not create the payment order.');
  }
});

// ── Verify the payment signature (HMAC-SHA256 of "order_id|payment_id") ────────
export const verifyRazorpayPayment = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to pay.');
  }

  const orderId = data?.razorpay_order_id as string | undefined;
  const paymentId = data?.razorpay_payment_id as string | undefined;
  const signature = data?.razorpay_signature as string | undefined;

  if (!orderId || !paymentId || !signature) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing payment verification fields.');
  }
  if (!KEY_SECRET) {
    throw new functions.https.HttpsError('failed-precondition', 'Razorpay keys are not configured.');
  }

  const expected = crypto
    .createHmac('sha256', KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  const valid =
    expected.length === signature.length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));

  if (!valid) {
    // Signature mismatch — do NOT treat this as a successful payment.
    throw new functions.https.HttpsError('permission-denied', 'Payment signature verification failed.');
  }

  return { verified: true, paymentId };
});
