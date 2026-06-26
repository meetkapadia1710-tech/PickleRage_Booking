# PlayHub – Full Codebase Audit Report
**Date:** 2026-06-26  
**Auditor:** Senior Staff Engineer / Security Engineer  
**Status:** Phase 1 complete — no changes made yet

---

## 1. Project Overview

PlayHub is a court-booking mobile/web hybrid application built for Pickleball and Box Cricket venues in Bharuch, Gujarat. It is simultaneously deployed as:

- A **Progressive Web App** on Firebase Hosting / Vercel
- A **native Android APK** via Capacitor

### Tech Stack (as found)

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Tailwind CSS v4, Framer Motion, React Router v7 |
| Bundler | Vite 8, vite-plugin-pwa |
| Mobile | Capacitor 8 (Android) |
| Auth | Firebase Authentication (Google Sign-In) |
| Database | Cloud Firestore |
| Backend | Firebase Cloud Functions Gen 1 (Node 18) |
| Payment | Razorpay Standard Checkout |
| Map | Leaflet / React-Leaflet |
| Hosting | Firebase Hosting + Vercel |
| Notifications | Firebase Cloud Messaging (FCM) |
| Wallet | Google Wallet (pass JWT signed server-side) |

---

## 2. Architecture

```
src/
  App.tsx              — Router, guards, providers
  firebase.ts          — Firebase SDK init (reads VITE_ env vars)
  types.ts             — Shared TypeScript interfaces
  main.tsx             — React entry point
  auth/
    googleSignIn.ts        — Platform dispatcher (dynamic import)
    googleSignIn.web.ts    — Browser popup flow
    googleSignIn.native.ts — Capacitor native Google chooser
    types.ts
  components/          — AppHeader, BottomNav, Avatar, Toast, SmartImage,
                         NotificationsPanel, PageTransition
  context/
    AuthContext.tsx     — Firebase onAuthStateChanged + Firestore profile check
  lib/
    razorpay.ts         — Cloud Function call wrappers (createOrder, verify)
    wallet.ts           — Cloud Function call wrapper (generateWalletPassUrl)
    store.ts            — localStorage bookings + favorites cache
    venues.ts           — sanitizeVenue() — hardcoded overrides for 3 venues
    notifications.ts    — Capacitor push notification setup
    format.ts           — Time/date formatters
    maps.ts             — Google Maps URL builders
    appUrl.ts           — Canonical public URL helper
    backClose.ts        — Android back gesture overlay stack
  pages/               — SplashScreen, PhoneLogin, CompleteProfile, Home,
                         VenueDetail, TimeSlots, PaymentSuccess, MyBookings,
                         Leaderboard, Friends, MapExplore, Profile,
                         AdminDashboard, SplitPayment
  data/
    mockVenues.ts       — Unused mock venue array
    mockBookings.ts     — Unused mock booking array
  native/
    androidBack.ts      — Capacitor App plugin back-button handler

functions/
  src/
    index.ts            — Firebase app init + wallet pass generator
    razorpay.ts         — createRazorpayOrder, verifyRazorpayPayment
    notifications.ts    — sendBookingConfirmation, onBookingUpdate,
                          sendBookingReminder (scheduled hourly)
```

### Data Model (Firestore)

```
/users/{uid}           — UserProfile (displayName, phone, photoURL, fcmTokens)
/admins/{uid}          — Empty doc; existence = admin flag
/venues/{venueId}      — Venue (name, type, images, price, amenities, …)
/courts/{courtId}      — Court (venueId, name, surface, isIndoor, …)
/bookings/{bookingId}  — Booking (userId, venueId, courtId, date, times,
                          status, splitPayment{…})
/friendRequests/{id}   — FriendRequest (fromUid, toUid, status, …)
/friends/{uid}/list/{friendId} — Friend link (bidirectional subcollection)
```

---

## 3. Existing Features

- Google Sign-In (web popup + native Android chooser)
- Phone number required on first login (profile completion gate)
- Venue browsing with sport-type filter
- Real-time slot availability via Firestore `onSnapshot`
- Time slot booking with Razorpay payment
- Split payment (Instant / Hold modes) with friend invite links
- Google Wallet pass generation (server-signed JWT)
- My Bookings with real-time updates and cancellation
- Leaderboard (booking count / hours played)
- Friends system (phone-based search, requests, bidirectional list)
- Map exploration (Leaflet, OpenStreetMap tiles)
- Push notifications via FCM + Capacitor
- Admin dashboard (venues, courts, bookings, users management)
- Haptic feedback, Android back gesture handling
- PWA manifest (self-destroying SW for Capacitor WebView)

---

## 4. Security Audit

### 🔴 CRITICAL

#### SEC-01 — Google Service Account Private Key in `.env` (VITE_ prefix pattern)

**File:** `.env`

```
VITE_WALLET_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADA…"
VITE_WALLET_CLIENT_EMAIL="google-wallet-signer@…"
VITE_WALLET_ISSUER_ID=3388000000023157754
```

Any environment variable prefixed `VITE_` is **inlined into the browser JavaScript bundle by Vite**. The current source code does not reference `import.meta.env.VITE_WALLET_*` anywhere, so the key is not currently being bundled. However:

1. The README instructs every new developer to place these credentials in `.env` using the `VITE_` prefix, creating a documented path to accidental exposure.
2. The `.runtimeconfig.json` in `functions/` contains the same private key in plaintext.
3. This RSA-2048 key should only ever exist in a secret manager (Google Secret Manager) or as a Firebase Functions environment secret — never in any file on disk.

**Risk:** If a developer follows the README or if this key is ever consumed via `import.meta.env`, the Google Wallet service account private key ships to every end-user's browser.

**Fix:** Remove all `VITE_WALLET_*` vars from `.env`. Move to `firebase functions:secrets:set WALLET_PRIVATE_KEY`. Remove `functions/.runtimeconfig.json` from the repository (add it to `.gitignore`). Update the README.

---

#### SEC-02 — Razorpay Key Secret in `functions/.env`

**File:** `functions/.env`

```
RAZORPAY_KEY_SECRET=s3Qe0YcvSUP7IqSZLnrafSxH
```

This is a test-mode secret (`rzp_test_`) but it is still a credential. The `functions/.gitignore` excludes `.env`, so it is not committed — however it exists on disk and could be accidentally committed or exposed. More importantly, **the same pattern would be used for live keys**.

**Fix:** Use Firebase Secret Manager for all Cloud Function secrets:
```bash
firebase functions:secrets:set RAZORPAY_KEY_SECRET
```
Then access via `defineSecret()` in the function (Gen 2 API).

---

#### SEC-03 — Hardcoded Admin Email in Firestore Security Rules

**File:** `firestore.rules` line 15

```javascript
function isAdmin() {
  return isSignedIn()
    && (
      request.auth.token.email == "1080patelharshil@gmail.com"   // ← hardcoded
      || exists(/databases/$(database)/documents/admins/$(request.auth.uid))
    );
}
```

A personal Gmail address hardcoded into security rules grants **permanent admin access** to that Google account. If that account is compromised or handed to someone else, they have unrestricted write access to all venues, courts, and the ability to delete any booking.

**Fix:** Remove the hardcoded email. Rely solely on the `admins` collection document existence check. Provision the initial admin by manually adding the document via Firebase Console.

---

### 🟠 HIGH

#### SEC-04 — No Input Validation on Firestore Writes

User-controlled data (display names, phone numbers, friend search queries) is written directly to Firestore without sanitization or length limits. The Firestore Security Rules enforce structural correctness (e.g. `request.resource.data.fromUid == request.auth.uid`) but do **not** validate field lengths, character sets, or injection payloads.

**Risk:** A malicious user could store very long strings (DoS via storage costs) or attempt XSS payloads in `displayName` that render in other users' UI.

**Fix:** Add field-level validation in Firestore Security Rules (e.g. `request.resource.data.displayName.size() <= 64`) and validate on the client before writing.

---

#### SEC-05 — No Rate Limiting on Cloud Functions

The `createRazorpayOrder` and `verifyRazorpayPayment` Cloud Functions have no rate limiting. An attacker can call `createRazorpayOrder` in a loop to inflate Razorpay order counts, hit Firebase Function invocation quotas, and incur costs.

**Fix:** Implement App Check in Firebase. Add per-user rate limiting using Firestore counters or Firebase App Check with reCAPTCHA Enterprise.

---

#### SEC-06 — No HTTP Security Headers on Firebase Hosting

**File:** `firebase.json`

The hosting configuration has no `headers` section. There are no:
- `Content-Security-Policy`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy`
- `Permissions-Policy`

**Fix:** Add a `headers` block to `firebase.json`.

---

#### SEC-07 — APK Binary Committed to Git

**File:** `PickleRage01.apk` (5.9 MB)

A compiled Android APK is tracked in the git repository. This:
- Bloats every clone by ~6 MB permanently
- Exposes the signing keystore SHA-1 fingerprint in the APK manifest
- Creates false confidence that the "current" APK matches the current source

**Fix:** Delete from git history (`git filter-branch` / BFG), add `*.apk` to `.gitignore`.

---

### 🟡 MEDIUM

#### SEC-08 — OAuth Client ID Hardcoded in Source

**File:** `capacitor.config.ts`

```typescript
serverClientId: '21785967034-v32c2s1gdnvnm9j8clnc2utg8gbd8ahn.apps.googleusercontent.com',
```

OAuth Client IDs are semi-public (they appear in OAuth flows), but hardcoding them makes rotating credentials require a code change and rebuild.

---

#### SEC-09 — `functions/.runtimeconfig.json` Contains Production Secrets

This file (used by the local emulator) contains the Google Wallet private key and should be in `.gitignore`. Currently the `functions/.gitignore` only excludes `node_modules/` and `.env*` — it does not exclude `.runtimeconfig.json`.

---

## 5. Code Quality Issues

### 🔴 Critical Bugs

#### BUG-01 — Dual Source of Truth for Bookings (localStorage vs Firestore)

**File:** `src/lib/store.ts`, `src/components/NotificationsPanel.tsx`

`store.ts` maintains a `localStorage` cache of bookings. When a booking is confirmed via `TimeSlots.tsx`, it is saved to **Firestore** via `setDoc`. However, `NotificationsPanel` calls `getUserBookings()` which reads from **localStorage** (never populated in the current flow), meaning notifications are always empty.

The `addBooking()` function in `store.ts` is never called anywhere — it's dead code. Favorites also live in localStorage, but booking data should be purely Firestore-driven.

---

#### BUG-02 — `NotificationsPanel` Uses `mockVenues` Instead of Firestore

**File:** `src/components/NotificationsPanel.tsx`

```typescript
const venue = mockVenues.find(v => v.id === b.venueId);
```

Even if notifications were populated, venue names would come from `mockVenues` (a static array with 3 entries), not from the live Firestore venue data. Users at any fourth venue would see "Your court" as the venue name.

---

#### BUG-03 — Hardcoded Courts for `venue_2` in Three Places

Courts for "Rooftop Pickleball" (`venue_2`) are hardcoded inline in:
- `src/pages/TimeSlots.tsx` (lines ~50–55)
- `src/pages/VenueDetail.tsx` (lines ~72–75)
- `src/pages/MyBookings.tsx` (lines ~47–52)

Any change to court configuration requires editing three separate files. A Firestore document for these courts should be created and the hardcoded fallbacks removed.

---

#### BUG-04 — Double Firebase Functions Instance Creation

**Files:** `src/lib/razorpay.ts`, `src/lib/wallet.ts`

Both files call `getFunctions(app)` and `connectFunctionsEmulator(fns, …)` independently at **module load time** (module-level side effects). Because both use the same `app` instance, Firebase SDK deduplicates the Functions instance — but calling `connectFunctionsEmulator` twice on the same instance can cause warnings and unpredictable behavior. The emulator also connects for **any** `192.168.x` address, which means the emulator attaches when running from any device on the local network, including production devices that happen to be on the same subnet as a developer.

---

#### BUG-05 — `hasUnread` Notification Badge Is Hardcoded to `true`

**File:** `src/components/AppHeader.tsx`

```typescript
const [hasUnread, setHasUnread] = useState(true);
```

The notification dot always shows red regardless of whether there are real unread notifications. It is set to `false` when the panel is opened but resets to `true` on every mount.

---

#### BUG-06 — Date Parsing Bug in `PaymentSuccess`

**File:** `src/pages/PaymentSuccess.tsx`

```typescript
const date = new Date(selectedDate);
```
(seen in booking detail rendering)

Parsing a `YYYY-MM-DD` string without a time zone as `new Date(isoString)` is interpreted as **UTC midnight**, which renders as the previous day in negative-UTC-offset time zones. This matches the same issue fixed elsewhere by appending `T00:00:00`.

---

### 🟠 Architecture / Maintainability

#### ARCH-01 — `package.json` Name is "temp"

```json
{ "name": "temp" }
```

The project was scaffolded but never renamed. This affects npm tooling, error messages, and professionalism of any CI output.

---

#### ARCH-02 — `sanitizeVenue()` is a Data Patch, Not a Data Layer

**File:** `src/lib/venues.ts`

`sanitizeVenue()` hardcodes overrides for venue IDs `venue_1`, `venue_2`, `venue_3`. This means the Firestore documents for those venues are partially ignored, and the application silently applies a different name/address/coordinates. This creates a hidden layer that makes Firestore the "wrong" source of truth for these specific venues. The admin panel edits will be overridden at render time.

---

#### ARCH-03 — Firebase Functions Gen 1 API (Deprecated)

**File:** `functions/src/`

All Cloud Functions use the Gen 1 API (`functions.https.onCall`, `functions.firestore.document`, `functions.pubsub.schedule`). Gen 1 is in maintenance mode; Gen 2 (`onCall`, `onDocumentCreated`, `onSchedule` from `firebase-functions/v2`) is the current standard. Gen 1 functions cold-start in 2–5 seconds; Gen 2 functions support minimum instances and are significantly faster.

---

#### ARCH-04 — `functions.config()` is Deprecated

**File:** `functions/src/index.ts`

```typescript
const walletCfg = (functions.config() as …)['wallet'] ?? {};
```

`functions.config()` is the Gen 1 environment config system, deprecated in favor of `process.env` (via `.env` files) or Firebase Secret Manager. The function has a fallback for missing config, but the production path relies on deprecated infrastructure.

---

#### ARCH-05 — N+1 Query Patterns

**File:** `src/pages/Friends.tsx`

```typescript
const profiles = await Promise.all(
  snap.docs.map(async d => {
    const profileSnap = await getDoc(doc(db, 'users', d.id));  // one read per friend
    return profileSnap.exists() ? …
  })
);
```

For a user with 50 friends, this performs 51 Firestore reads per page load. Should be batched using `getDoc` in parallel (already uses `Promise.all`, which is correct) but can be replaced with a single `getDocs` with `where('uid', 'in', friendIds)` for IDs fetched in batches of 10.

**File:** `src/pages/Leaderboard.tsx`

Fetches all users then all bookings with no limit — O(users × bookings) in memory. No pagination.

---

#### ARCH-06 — Abandoned Directories in Root

```
stitch_elite_court_booking/   — contains a nested git repo
rooftop pickleball/           — contains WhatsApp photos (design references)
photos/                       — (not inspected, likely more assets)
```

These directories should not be in the project repository. `stitch_elite_court_booking/` appears to be an entirely separate project.

---

#### ARCH-07 — `legacy-peer-deps=true` in `.npmrc`

This flag suppresses peer dependency conflicts. It masks real version incompatibilities that should be resolved explicitly.

---

### 🟡 Code Smells

| ID | File | Issue |
|---|---|---|
| CS-01 | `src/pages/TimeSlots.tsx` | 500+ line component. Booking logic, split payment state, UI, and payment flow all in one file. |
| CS-02 | `src/pages/AdminDashboard.tsx` | 900+ line file. Entire admin system in a single component. |
| CS-03 | `src/pages/VenueDetail.tsx` | Variable shadow: `const id = venueSnap.id` shadows outer `id` from `useParams`. |
| CS-04 | `src/lib/store.ts` | `addBooking()`, `cancelBooking()`, `getUserBookings()` are dead code — never called from the real Firestore booking flow. |
| CS-05 | `src/data/mockBookings.ts` | Never imported anywhere except NotificationsPanel (via store). |
| CS-06 | `src/data/mockVenues.ts` | Only used in `NotificationsPanel` — a wrong data source. |
| CS-07 | Multiple pages | `console.log`, `console.warn`, `console.error` used for structured logging (39 occurrences). Should be replaced with a proper logger. |
| CS-08 | `capacitor.config.ts` | `appName: 'playhub'` (lowercase) but the app displays as "PlayHub". |
| CS-09 | `src/lib/appUrl.ts` | `PUBLIC_APP_URL` is hardcoded to a Vercel URL. Breaks if deployment URL changes. |

---

## 6. Performance Issues

#### PERF-01 — No Pagination on Any Firestore Query

The Leaderboard fetches **all** users and **all** bookings simultaneously. As the platform grows, this will become extremely slow and expensive.

#### PERF-02 — Confetti Canvas on PaymentSuccess

`PaymentSuccess.tsx` runs a manual `requestAnimationFrame` canvas animation loop. While visually nice, it holds a canvas context and RAF loop without proper cleanup. If the user navigates away before the animation completes, the loop may continue running.

#### PERF-03 — Missing Firestore Composite Indexes

Only one composite index is defined (`venueId + courtId + date + status` for bookings). The Leaderboard's queries over all bookings for date-range filtering will fail or do full collection scans without proper indexes.

#### PERF-04 — No Image Optimization

`SmartImage.tsx` lazy-loads images but there's no WebP conversion, responsive `srcset`, or CDN resizing. Venue images are served as full-resolution JPEGs.

---

## 7. Testing

**Zero test files exist in the project.**

No unit tests, integration tests, or end-to-end tests. Critical paths with zero coverage:

- Payment flow (Razorpay order creation → verification → Firestore write)
- Split payment logic (share calculation, payer updates, confirmation trigger)
- Firestore Security Rules
- Auth guards (ProtectedRoute, PublicRoute, CompleteProfileRoute)
- Admin operations

---

## 8. Documentation

The `README.md` exists but contains inaccuracies:
- Mentions "Test Email/Password" login which does not exist (Google-only auth)
- Documents `VITE_WALLET_*` as a recommended `.env` pattern (security risk)
- No mention of Cloud Functions deployment, emulator setup, or Firestore index deployment

**Missing docs:**
- `docs/architecture.md`
- `docs/database.md`
- `docs/api.md`
- `docs/deployment.md`
- `docs/security.md`
- `docs/testing.md`

---

## 9. CI/CD & DevOps

| Item | Status |
|---|---|
| GitHub Actions CI | ❌ Missing |
| Lint on push | ❌ Missing |
| Type-check on push | ❌ Missing |
| Test run on push | ❌ Missing (no tests) |
| Security scan | ❌ Missing |
| Docker / docker-compose | ❌ Missing |
| Automated deployment | ❌ Missing |
| Environment separation (dev/staging/prod) | ❌ Missing |
| Secrets managed via CI secret store | ❌ Missing |

---

## 10. Dependency Audit

| Package | Current | Issue |
|---|---|---|
| `firebase-functions` | `^4.3.1` | Gen 1, maintenance mode. Gen 2 (`v6`) is current. |
| `firebase-admin` | `^11.8.0` | 2 major versions behind (v13 current). |
| `protobufjs` | (transitive) | 1 moderate vulnerability (schema name shadowing) — `npm audit fix` resolves. |
| `typescript` (functions) | `^4.9.0` | Very outdated vs frontend's `~6.0.2`. |
| `@capacitor/*` | `^8.x` | Current — good. |
| `react` | `^19.2.6` | Current — good. |
| `vite` | `^8.0.12` | Current — good. |
| `framer-motion` | `^12.40.0` | Current — good. |

---

## 11. Accessibility

- No ARIA labels on icon-only buttons (notification bell, back arrow, filter pills)
- No `role` attributes on modal/bottom-sheet overlays
- Keyboard navigation not testable without a focus management system
- Color contrast for `text-on-surface-variant` on some backgrounds has not been verified

---

## 12. Summary — Priority Matrix

### 🔴 Fix Before Next Deployment (Security Critical)

| # | Issue | File(s) |
|---|---|---|
| 1 | Remove `VITE_WALLET_*` from `.env`; move wallet private key to Secret Manager | `.env`, `README.md`, `functions/src/index.ts` |
| 2 | Move `RAZORPAY_KEY_SECRET` to Firebase Secret Manager | `functions/.env`, `functions/src/razorpay.ts` |
| 3 | Remove hardcoded admin email from Firestore Security Rules | `firestore.rules` |
| 4 | Add `.runtimeconfig.json` to `functions/.gitignore` | `functions/.gitignore` |
| 5 | Add `*.apk` to `.gitignore`; remove APK from repo | `.gitignore`, git history |

### 🟠 Fix in Phase 2–3 (Correctness & Architecture)

| # | Issue |
|---|---|
| 6 | Unify booking data source — remove `localStorage` booking store |
| 7 | Fix `NotificationsPanel` to use Firestore data, not localStorage + mockVenues |
| 8 | Extract hardcoded `venue_2` courts to Firestore documents |
| 9 | Consolidate duplicate `connectFunctionsEmulator` calls |
| 10 | Fix hardcoded `hasUnread = true` — fetch real unread state |
| 11 | Remove `sanitizeVenue()` overrides — fix Firestore data directly |
| 12 | Rename `package.json` from "temp" to "playhub" |
| 13 | Remove `stitch_elite_court_booking/` and `rooftop pickleball/` from repo |
| 14 | Add input validation in Firestore Security Rules |
| 15 | Migrate Cloud Functions to Gen 2 API |

### 🟡 Phase 4–9 (Quality, Performance, Ops)

| # | Issue |
|---|---|
| 16 | Split `TimeSlots.tsx` and `AdminDashboard.tsx` into focused components |
| 17 | Add Firebase App Check + per-user rate limiting |
| 18 | Add HTTP security headers to `firebase.json` |
| 19 | Add pagination to Leaderboard and admin queries |
| 20 | Fix N+1 query in Friends page |
| 21 | Add React Error Boundary |
| 22 | Add structured logging (replace `console.*`) |
| 23 | Set up GitHub Actions CI (lint + typecheck + test) |
| 24 | Write unit tests for payment logic, auth guards, split payment math |
| 25 | Write Firestore Security Rules tests (`firebase emulators:exec`) |
| 26 | Add remaining Firestore composite indexes |
| 27 | Image optimization (WebP, responsive sizes) |
| 28 | Fix `PUBLIC_APP_URL` to come from environment variable |
| 29 | Fix `functions/tsconfig.json` to use TypeScript 5+ |
| 30 | Resolve `legacy-peer-deps` by fixing actual peer conflicts |

---

## 13. Proposed Phase Plan

```
Phase 1  ✅  Audit (this document)
Phase 2      Security fixes (SEC-01 through SEC-09)
Phase 3      Architecture fixes (dual data source, hardcoded data, dead code)
Phase 4      Code quality (split large files, DRY, naming, types)
Phase 5      Performance (pagination, indexes, image optimization)
Phase 6      Testing (unit + integration + Security Rules)
Phase 7      Documentation (docs/ folder, corrected README)
Phase 8      CI/CD (GitHub Actions — lint, typecheck, test, deploy)
Phase 9      DevOps (Docker, environment separation, monitoring hooks)
Phase 10     Accessibility & responsive polish
```

---

*This report reflects the state of the codebase as of 2026-06-26. No files were modified during the audit.*
