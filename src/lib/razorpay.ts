import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';
import { app } from '../firebase';

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
const createOrderFn = httpsCallable(fns, 'createRazorpayOrder');
const verifyPaymentFn = httpsCallable(fns, 'verifyRazorpayPayment');

type OrderResponse = { order_id: string; amount: number; currency: string; key_id?: string };
type RazorpaySuccess = { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string };
type RazorpayFailure = { error?: { description?: string } };
type RazorpayInstance = { open: () => void; on: (event: string, cb: (resp: RazorpayFailure) => void) => void };
type RazorpayCtor = new (options: Record<string, unknown>) => RazorpayInstance;

declare global {
  interface Window { Razorpay?: RazorpayCtor }
}

const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';
let scriptPromise: Promise<void> | null = null;

function loadCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise<void>((resolve, reject) => {
      const s = document.createElement('script');
      s.src = CHECKOUT_SRC;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => { scriptPromise = null; reject(new Error('Could not load Razorpay. Check your connection.')); };
      document.head.appendChild(s);
    });
  }
  return scriptPromise;
}

export type PayOptions = {
  amountRupees: number;
  receipt?: string;
  description?: string;
  prefill?: { name?: string; email?: string; contact?: string };
};

/**
 * Full Razorpay Standard Checkout flow:
 *   1. create order on the backend (Key Secret stays server-side)
 *   2. open the checkout modal
 *   3. verify the signature on the backend
 * Resolves with the verified payment id; rejects on dismiss / failure / bad signature.
 */
export async function payWithRazorpay(opts: PayOptions): Promise<{ paymentId: string; orderId: string }> {
  await loadCheckout();
  if (!window.Razorpay) throw new Error('Razorpay is unavailable.');

  const amount = Math.round(opts.amountRupees * 100); // rupees → paise
  const order = (await createOrderFn({ amount, currency: 'INR', receipt: opts.receipt })).data as OrderResponse;

  const keyId = order.key_id || (import.meta.env.VITE_RAZORPAY_KEY_ID as string | undefined);
  if (!keyId) throw new Error('Razorpay key is not configured.');

  return new Promise<{ paymentId: string; orderId: string }>((resolve, reject) => {
    const rzp = new window.Razorpay!({
      key: keyId,
      order_id: order.order_id,
      amount: order.amount,
      currency: order.currency,
      name: 'PlayHub',
      description: opts.description ?? 'Court booking',
      prefill: opts.prefill ?? {},
      theme: { color: '#00342b' },
      handler: async (resp: RazorpaySuccess) => {
        try {
          await verifyPaymentFn({
            razorpay_order_id: resp.razorpay_order_id,
            razorpay_payment_id: resp.razorpay_payment_id,
            razorpay_signature: resp.razorpay_signature,
          });
          resolve({ paymentId: resp.razorpay_payment_id, orderId: resp.razorpay_order_id });
        } catch {
          reject(new Error('Payment could not be verified.'));
        }
      },
      modal: { ondismiss: () => reject(new Error('Payment cancelled.')) },
    });

    rzp.on('payment.failed', (resp: RazorpayFailure) => {
      reject(new Error(resp?.error?.description || 'Payment failed.'));
    });
    rzp.open();
  });
}
