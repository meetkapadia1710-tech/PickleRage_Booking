# PlayHub - Premium Court & Venue Booking Application

PlayHub is a premium, feature-rich court booking application designed for mobile (native Android/iOS via Capacitor) and web (Progressive Web App). It provides real-time court availability, seamless booking confirmation, secure Google Login, a competitive leaderboard, and Google Wallet integration.

---

## 🚀 Key Features

### 1. Booking & Payment Flow
* **Live Slot Grid**: Instant booking grid listening to Firestore updates in real-time.
* **Confirmation Sheets**: Smooth slide-up bottom sheets built with `framer-motion`.
* **Confetti Success Page**: A premium checkout success screen featuring overlay confetti canvas animations.
* **Booking Records**: Comprehensive status categorization ("Confirmed", "Pending", "Cancelled") in the "My Bookings" menu.

### 2. Native Mobile Integration (Capacitor)
* **Google Wallet Passes**: Save booked tickets directly into your Google Wallet. It uses a custom **Web Crypto API RS256 JWT signer** to allow signing passes on the Firebase Spark (free) plan without requiring Cloud Functions.
* **Native Google Sign-In**: Uses native Android prompts (`@codetrix-studio/capacitor-google-auth`) instead of in-app web views to prevent Google's "Disallowed User-Agent" security block.
* **Platform-Isolated Login**: Website and APK Google-login flows are fully separated (`src/auth/googleSignIn.web.ts` vs `src/auth/googleSignIn.native.ts`, selected via dynamic import) so fixing one platform can never break the other — see `src/auth/README.md` for the per-platform fix workflow.
* **Haptic Feedback**: Integrates `@capacitor/haptics` to deliver physical controller vibrations on critical UI actions (like payment approval).
* **StatusBar Control**: Configures native device bezel and status bar colors to match PlayHub's signature deep teal theme.

### 3. Explore & Discover
* **Interactive Map Exploration**: Discover nearby courts and grounds instantly using an integrated map interface built with Leaflet.
* **Detailed Venue Profiles**: View comprehensive venue details with favoriting, dynamic content rendering, and social sharing capabilities.

### 4. Competitions & Community
* **Friends & Social Network**: Add friends, manage your friends list, and get real-time notifications for social interactions.
* **Leaderboards**: Automatically aggregates Firestore booking metrics per user to rank players.
* **Winners Podium**: An interactive podium layout displaying avatars and animated trophies for the top 3 players.

### 5. Admin Operations
* **Dashboard Console**: Desktop-responsive sidebar control panels displaying core KPI metrics and table lists for booking records.
* **Database Seeder**: Quick-start setup buttons to auto-populate Firestore collections with default venues and court configurations.

---

## 🛠️ Tech Stack
* **Frontend**: React 19, TypeScript, Tailwind CSS, Framer Motion, Leaflet
* **Bundler & Tooling**: Vite, Vite-plugin-PWA, ESLint
* **Backend**: Firebase Authentication, Firestore Database
* **Hybrid Core**: Capacitor CLI (@capacitor/android, @capacitor/core)
* **Security & Keys**: Native Web Crypto API (SubtleCrypto)

---

## ⚙️ Project Setup & Installation

### 1. Clone & Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory:
```env
# Google Wallet Service Account Configurations
VITE_WALLET_ISSUER_ID="3388000000023155636"
VITE_WALLET_CLIENT_EMAIL="google-wallet-signer@picklerage-booking-499009.iam.gserviceaccount.com"
VITE_WALLET_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_NEWLINES_ESCAPED\n-----END PRIVATE KEY-----\n"
```

### 3. Run Development Server
To launch the dev server locally:
```bash
npm run dev
```
Open **`http://localhost:5001`** in your browser. Use the mock test credentials on the login screen to sign in instantly:
* **Test Email**: `testplayer@playhub.com`
* **Test Password**: `password123`

---

## 📱 Native Android Build Instructions

### 1. Compile Web Assets & Sync Capacitor
```bash
npm run build
npx cap sync
```

### 2. Place Configuration Files
Make sure the `google-services.json` file is present in your native project:
* Path: `android/app/google-services.json`

### 3. Compile the APK
To build the debug APK using the local JetBrains OpenJDK toolchain:
```powershell
$env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"
cd android
./gradlew assembleDebug
```
The compiled output is saved at:
👉 `android/app/build/outputs/apk/debug/app-debug.apk`

---

## 🔒 Production Guidelines for Release

1. **Google Wallet Publishing Access**: Go to Google Pay & Wallet Developer Console and switch your Issuer ID from **Demo Mode** to **Live Mode**.
2. **Move JWT Signer to Backend**: Prior to publishing publicly, migrate the private key signing logic in `src/lib/wallet.ts` to a secure server or serverless endpoint (e.g. Vercel, Render) to protect your GCP credentials.
3. **Register Release Fingerprints**: In Google Play Console, copy the release SHA-1 signature and add it to your Firebase Project Settings to authorize production OAuth requests.
