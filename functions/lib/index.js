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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateWalletPassUrl = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
const crypto = __importStar(require("crypto"));
admin.initializeApp();
__exportStar(require("./notifications"), exports);
__exportStar(require("./razorpay"), exports);
// ─── Helpers ─────────────────────────────────────────────────────────────────
function b64url(str) {
    return Buffer.from(str).toString('base64url');
}
function buildWalletPass(bookingId, date, startTime, venueName, courtName, price, issuerId) {
    const classId = 'playhub_court_booking';
    return {
        genericClasses: [{ id: `${issuerId}.${classId}` }],
        genericObjects: [{
                id: `${issuerId}.${bookingId}`,
                classId: `${issuerId}.${classId}`,
                state: 'ACTIVE',
                cardTitle: { defaultValue: { language: 'en-US', value: 'PlayHub Court Booking' } },
                header: { defaultValue: { language: 'en-US', value: venueName } },
                subheader: { defaultValue: { language: 'en-US', value: courtName } },
                logo: {
                    // Update this URL once the app logo is deployed to Firebase Hosting.
                    sourceUri: { uri: 'https://picklerage-booking.web.app/favicon.svg' },
                },
                barcode: { type: 'QR_CODE', value: bookingId, alternateText: bookingId },
                textModulesData: [
                    { id: 'date_time', header: 'DATE & TIME', body: `${date} • ${startTime}` },
                    { id: 'price', header: 'PRICE', body: `₹${price}.00` },
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
exports.generateWalletPassUrl = functions.https.onCall(async (data, context) => {
    var _a, _b, _c, _d;
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
    }
    const { bookingId, date, startTime, venueName, courtName, price } = data;
    const walletCfg = (_a = functions.config()['wallet']) !== null && _a !== void 0 ? _a : {};
    const issuerId = (_b = walletCfg['issuer_id']) !== null && _b !== void 0 ? _b : '';
    const clientEmail = (_c = walletCfg['client_email']) !== null && _c !== void 0 ? _c : '';
    const privateKey = ((_d = walletCfg['private_key']) !== null && _d !== void 0 ? _d : '').replace(/\\n/g, '\n');
    const passObj = buildWalletPass(bookingId, date, startTime, venueName, courtName, price, issuerId || 'UNCONFIGURED');
    if (issuerId && clientEmail && privateKey) {
        try {
            const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
            const payload = b64url(JSON.stringify({
                iss: clientEmail, aud: 'google', typ: 'savetowallet',
                iat: Math.floor(Date.now() / 1000),
                payload: passObj,
            }));
            const signer = crypto.createSign('RSA-SHA256');
            signer.update(`${header}.${payload}`);
            const sig = signer.sign(privateKey, 'base64url');
            return { url: `https://pay.google.com/gp/v/save/${header}.${payload}.${sig}` };
        }
        catch (err) {
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
//# sourceMappingURL=index.js.map