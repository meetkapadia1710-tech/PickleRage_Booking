# Deployment

## Environment variables

### Frontend (`.env` in project root)

```env
# Firebase — web app config (safe to expose; protected by Firestore rules + Auth)
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# Google Wallet pass signing — SERVICE ACCOUNT PRIVATE KEY
# WARNING: These are sensitive. Consider moving signing to a Cloud Function
# (src/lib/wallet.ts already calls generateWalletPassUrl — the key only needs
# to live in functions/.env, not here, if you use that path exclusively).
VITE_WALLET_ISSUER_ID=
VITE_WALLET_CLIENT_EMAIL=
VITE_WALLET_PRIVATE_KEY=
```

### Cloud Functions (`functions/.env`)

```env
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
```

**Never commit either `.env` file.** Both are git-ignored.

---

## Firebase Hosting (web)

### First-time setup

1. Install the Firebase CLI: `npm install -g firebase-tools`
2. Log in: `firebase login`
3. Select your project: `firebase use <project-id>`

### Deploy

```bash
npm run build
firebase deploy --only hosting
```

The `firebase.json` `rewrites` rule sends all requests to `index.html` (SPA fallback). Static assets are served with a 1-year immutable `Cache-Control` header; `index.html` is served with `no-cache`.

---

## Firestore rules and indexes

```bash
firebase deploy --only firestore
```

This deploys both `firestore.rules` and `firestore.indexes.json`. Index builds take a few minutes; the Firebase console shows build progress.

---

## Cloud Functions

```bash
firebase deploy --only functions
```

Requires Node 18 runtime (set in `functions/package.json`). Functions are Gen 1. Migrate to Gen 2 when Cloud Functions for Firebase supports it cleanly with the existing call pattern.

---

## Android APK

### Debug build

```powershell
npm run build
npx cap sync
$env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"
cd android
./gradlew assembleDebug
```

Output: `android/app/build/outputs/apk/debug/app-debug.apk`

### Release build (Play Store)

```powershell
./gradlew bundleRelease
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`

Sign the AAB with your keystore before uploading to the Play Store.

### Release prerequisites

- Add the release SHA-1 fingerprint to Firebase → Project Settings → Your apps → Android app.
- Enable Live Mode for the Google Wallet Issuer ID in the Google Pay & Wallet Console.
- Set `RAZORPAY_KEY_SECRET` in Cloud Functions environment (never in client env vars).

---

## Local development with Firebase Emulators

```bash
firebase emulators:start --only firestore,functions,auth
```

The app auto-detects `localhost` / `127.0.0.1` and connects to the Functions emulator on port `5002`. See `src/lib/functions.ts`.

To populate Firestore with seed data, use the Admin SDK or the Firestore emulator UI at `http://localhost:4000`.
