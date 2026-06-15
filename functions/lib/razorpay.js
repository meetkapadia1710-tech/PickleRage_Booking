"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyRazorpayPayment = exports.createRazorpayOrder = void 0;
const functions = __importStar(require("firebase-functions"));
const crypto = __importStar(require("crypto"));
const razorpay_1 = __importDefault(require("razorpay"));
// Credentials come from functions/.env (loaded by the Firebase CLI). The Key
// Secret stays server-side and is never returned to the client.
const KEY_ID = process.env.RAZORPAY_KEY_ID;
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
function getClient() {
    if (!KEY_ID || !KEY_SECRET) {
        throw new functions.https.HttpsError('failed-precondition', 'Razorpay keys are not configured.');
    }
    return new razorpay_1.default({ key_id: KEY_ID, key_secret: KEY_SECRET });
}
// ── Create an order (amount is in paise) ──────────────────────────────────────
exports.createRazorpayOrder = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to pay.');
    }
    const amount = Math.round(Number(data === null || data === void 0 ? void 0 : data.amount));
    const currency = (data === null || data === void 0 ? void 0 : data.currency) || 'INR';
    const receipt = (data === null || data === void 0 ? void 0 : data.receipt) || `rcpt_${Date.now()}`;
    if (!Number.isFinite(amount) || amount < 100) {
        throw new functions.https.HttpsError('invalid-argument', 'Amount must be at least 100 paise (₹1).');
    }
    try {
        const order = await getClient().orders.create({ amount, currency, receipt });
        return { order_id: order.id, amount: order.amount, currency: order.currency, key_id: KEY_ID };
    }
    catch (err) {
        console.error('Razorpay order creation failed:', err);
        throw new functions.https.HttpsError('internal', 'Could not create the payment order.');
    }
});
// ── Verify the payment signature (HMAC-SHA256 of "order_id|payment_id") ────────
exports.verifyRazorpayPayment = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to pay.');
    }
    const orderId = data === null || data === void 0 ? void 0 : data.razorpay_order_id;
    const paymentId = data === null || data === void 0 ? void 0 : data.razorpay_payment_id;
    const signature = data === null || data === void 0 ? void 0 : data.razorpay_signature;
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
    const valid = expected.length === signature.length &&
        crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    if (!valid) {
        // Signature mismatch — do NOT treat this as a successful payment.
        throw new functions.https.HttpsError('permission-denied', 'Payment signature verification failed.');
    }
    return { verified: true, paymentId };
});
//# sourceMappingURL=razorpay.js.map