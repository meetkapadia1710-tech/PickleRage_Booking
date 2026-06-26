# Security

## Authentication

PlayHub uses **Firebase Authentication with Google Sign-In only**. There is no email/password login.

- **Web**: `signInWithPopup` (Firebase web SDK)
- **Android**: `@codetrix-studio/capacitor-google-auth` native popup (avoids Google's WebView OAuth block)

Auth state is managed in `src/context/AuthContext.tsx`. Every protected route checks `currentUser` and redirects unauthenticated visitors to `/login`.

### Admin access

Admin status is determined by the **existence** of a document at `/admins/{uid}` in Firestore. The document content is irrelevant — only existence is checked. This avoids hard-coded email addresses in the rules.

---

## Firestore Security Rules

Rules live in `firestore.rules`. Key patterns:

### User documents

- Only the authenticated owner can read or write their own `/users/{uid}` document.
- Client writes are validated with field-level helpers: `displayName` ≤ 64 chars, `phone` matches `^[6-9][0-9]{9}$`, `email` ≤ 254 chars, `photoURL` ≤ 512 chars.

### Bookings

- Any authenticated user can **read** any booking (needed for the slot-conflict check in TimeSlots).
- **Create** is intentionally blocked on the client. Bookings are written server-side by the `verifyPayment` Cloud Function using the Firebase Admin SDK, which bypasses client-facing rules.
- **Update** from the client is restricted to a single operation: setting `status` to `'cancelled'` on a booking the caller owns.
- **Delete** is blocked for all clients.

### Venues and courts

- Read: public (any authenticated user).
- Write: requires the caller's UID to exist in `/admins/{uid}`.

---

## HTTP Security Headers

Served by Firebase Hosting (`firebase.json`):

| Header | Value |
|---|---|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(self)` |
| `Content-Security-Policy` | Allows `self`, inline scripts (Razorpay requirement), `checkout.razorpay.com`, Firebase/Google APIs |

Static assets (JS, CSS, fonts) are served with `Cache-Control: public, max-age=31536000, immutable`. `index.html` is served with `no-cache, no-store, must-revalidate`.

---

## Secrets management

| Secret | Location | Notes |
|---|---|---|
| Razorpay Key Secret | `functions/.env` | Server-side only; never in client bundle |
| Google Wallet private key | `.env` (client) | Ideally move to `functions/.env` — wallet signing already goes through a Cloud Function |
| Firebase web config | `.env` (client) | Safe to expose; protected by Auth + Firestore rules |
| `google-services.json` | `android/app/` | Committed to repo; contains no secrets |

Git-ignored files: `.env`, `functions/.env`, `functions/.runtimeconfig.json`, `android/app/build/`, `*.apk`, `*.aab`.

---

## Known risks and mitigations

| Risk | Mitigation |
|---|---|
| `VITE_WALLET_PRIVATE_KEY` in client bundle | Move signing exclusively to the `generateWalletPassUrl` Cloud Function; remove the key from the client env entirely |
| Cloud Functions still on Gen 1 (Node 18, deprecated) | Migrate to Gen 2 before Firebase removes Gen 1 support |
| Leaderboard reads all confirmed bookings (up to 2 000) | Capped with `limit(2000)`; long-term fix is a pre-computed leaderboard written by a scheduled Cloud Function |
