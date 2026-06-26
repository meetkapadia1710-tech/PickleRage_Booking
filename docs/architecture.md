# Architecture

## Folder structure

```
src/
  assets/          Static assets (SVGs, images)
  auth/            Firebase Auth helpers — platform-split sign-in
    googleSignIn.ts          Barrel: re-exports correct platform impl via dynamic import
    googleSignIn.web.ts      Web popup flow
    googleSignIn.native.ts   Capacitor native flow
  components/      Shared UI components
    admin/         Admin-only sub-components (CourtEditor, VenueEditor, UserEditor)
  context/         React Context providers
    AuthContext.tsx          currentUser + profile state, refreshProfile()
  data/            (empty — mock data files were removed)
  lib/             Pure utility modules
    backClose.ts   Android hardware-back → close panel hook
    format.ts      formatTime / formatDate / endTimeOf helpers
    functions.ts   Firebase Functions singleton (emulator auto-connect)
    logger.ts      Structured logger (dev: all levels, prod: warn/error only)
    maps.ts        Google Maps embed/directions URL builders
    notifications.ts  Capacitor push-notification setup
    razorpay.ts    Razorpay checkout integration
    store.ts       localStorage — favorites only
    venues.ts      sanitizeVenue() — normalizes Firestore venue docs
    wallet.ts      Google Wallet pass URL via Cloud Function
  pages/           Route-level page components
  types.ts         Shared TypeScript interfaces
firebase.ts        Firebase app + Firestore + Auth singletons
App.tsx            Router tree
main.tsx           Entry point
```

## Auth flow

```
User lands on /
  └─ AuthContext checks Firebase Auth state
       ├─ Signed out → redirect to /login
       └─ Signed in
             ├─ profileComplete === false → redirect to /complete-profile
             └─ profileComplete === true  → allow navigation
```

The `/admins/{uid}` Firestore collection gates access to `/admin`. The `AdminDashboard` component checks `getDoc(doc(db, 'admins', uid))` on mount and shows an "Access Denied" screen if the document does not exist.

## Booking flow

```
VenueDetail → TimeSlots
  1. TimeSlots fetches venue + courts from Firestore
  2. Attaches an onSnapshot listener for today's confirmed bookings on the selected court
  3. User picks a slot → taps "Confirm Booking"
  4. payWithRazorpay() calls createOrder Cloud Function
  5. Razorpay checkout overlay appears
  6. On success, verifyPayment Cloud Function validates the HMAC signature
  7. Cloud Function writes a confirmed booking doc to /bookings/{id}
  8. React navigates to /payment-success/:bookingId
```

## Data flow

- **Firestore** is the single source of truth for bookings, venues, courts, and user profiles.
- **localStorage** is used exclusively for the favorites list (venue IDs). No booking state is ever stored in localStorage.
- **Cloud Functions** handle all server-side secrets: Razorpay key, Google Wallet service-account signing.
- **onSnapshot** listeners are used on the bookings collection in TimeSlots and MyBookings for real-time updates.

## Key design decisions

| Decision | Rationale |
|---|---|
| Platform-split Google Sign-In | Google blocks in-app WebView OAuth. Native Capacitor plugin uses native prompts. |
| Cloud Functions for payments | Razorpay secret key must never reach the client bundle. |
| Cloud Functions for Wallet passes | Google Wallet RS256 JWT signing requires a service-account private key. |
| `sanitizeVenue()` | Normalizes inconsistent Firestore venue documents to a known shape. |
| `src/lib/functions.ts` singleton | Prevents double `connectFunctionsEmulator()` calls (which would throw). |
| No split payment / friends | Features were removed to simplify the product and eliminate the dual-source-of-truth issues they introduced. |
