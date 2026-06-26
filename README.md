# PlayHub — Court & Venue Booking

PlayHub is a mobile-first court booking app for Pickleball and Box Cricket. It runs as a native Android APK (Capacitor) and a Progressive Web App.

---

## Features

- **Live slot grid** — Real-time Firestore `onSnapshot` shows available and booked courts instantly.
- **Google Sign-In** — Native Android popup (`@codetrix-studio/capacitor-google-auth`) and web popup, fully separated so each can be fixed independently.
- **Razorpay payments** — Server-side `createOrder` + `verifyPayment` via Firebase Cloud Functions; keys never hit the client.
- **Google Wallet passes** — `generateWalletPassUrl` Cloud Function signs an RS256 JWT server-side and returns a ready-to-use Wallet link.
- **Interactive map** — Leaflet map shows venue pins; tapping navigates to the venue detail page.
- **Leaderboard** — Ranks players by confirmed booking count with a gold/silver/bronze podium.
- **Push notifications** — Firebase Cloud Messaging via `@capacitor/push-notifications`.
- **Admin dashboard** — Manage venues, courts, bookings, and users; access restricted to `/admins/{uid}` documents in Firestore.

---

## Tech stack

| Layer | Technology |
|---|---|
| UI | React 19, TypeScript, Tailwind CSS v4, Framer Motion |
| Routing | React Router v7 |
| Backend | Firebase Auth, Cloud Firestore, Cloud Functions (Node 18) |
| Payments | Razorpay Standard Checkout |
| Map | Leaflet / react-leaflet |
| Native | Capacitor 8 (Android) |
| PWA | vite-plugin-pwa |
| Bundler | Vite 8 |
| Testing | Vitest 3, jsdom |

---

## Project setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in your values. See `docs/deployment.md` for all required variables. **Do not commit `.env` — it is git-ignored.**

### 3. Run the dev server

```bash
npm run dev
```

The app opens at `http://localhost:5001`. Sign in with **Google Sign-In** — there is no email/password login.

> **Emulator tip** — `src/lib/functions.ts` auto-connects to the local Firebase Functions emulator (`localhost:5002`) when the hostname is `localhost` or `127.0.0.1`. Start it with `firebase emulators:start --only functions`.

---

## Available scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | TypeScript type-check + production build |
| `npm run lint` | ESLint across the whole project |
| `npm run preview` | Preview the production build locally |
| `npm test` | Run Vitest unit tests once |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run test:coverage` | Run tests with V8 coverage report |

---

## Android build

### 1. Build web assets and sync Capacitor

```bash
npm run build
npx cap sync
```

### 2. Place the Firebase config

Ensure `android/app/google-services.json` is present (downloaded from the Firebase console).

### 3. Compile the APK

```powershell
$env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"
cd android
./gradlew assembleDebug
```

Output: `android/app/build/outputs/apk/debug/app-debug.apk`

---

## Docs

Detailed documentation lives in the `docs/` directory:

- [`docs/architecture.md`](docs/architecture.md) — folder structure, data flow, key design decisions
- [`docs/database.md`](docs/database.md) — Firestore schema reference
- [`docs/deployment.md`](docs/deployment.md) — environment variables and deploy steps
- [`docs/security.md`](docs/security.md) — auth model, Firestore rules, CSP headers

---

## Production checklist

1. Activate Google Wallet Issuer ID in Live Mode (Google Pay & Wallet Console).
2. Add the release SHA-1 to Firebase Project Settings to authorize production OAuth.
3. Set `RAZORPAY_KEY_SECRET` in `functions/.env` (never in client-side env vars).
4. Deploy Firestore rules and indexes: `firebase deploy --only firestore`.
5. Deploy Cloud Functions: `firebase deploy --only functions`.
6. Deploy hosting: `firebase deploy --only hosting`.
