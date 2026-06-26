# Firestore Database Schema

All collections live in the default Firestore database.

---

## `/users/{uid}`

User profile document. Created or merged by AuthContext on first sign-in.

| Field | Type | Description |
|---|---|---|
| `uid` | `string` | Firebase Auth UID (same as document ID) |
| `displayName` | `string` | User's display name (max 64 chars) |
| `email` | `string` | Google account email (max 254 chars) |
| `phone` | `string` | 10-digit Indian mobile number |
| `photoURL` | `string` | Profile photo URL (max 512 chars) |
| `profileComplete` | `boolean` | `true` once the user has completed the onboarding form |
| `fcmTokens` | `string[]` | FCM device tokens (array union — one per device) |
| `createdAt` | `string` | ISO 8601 timestamp of account creation |
| `updatedAt` | `string` | ISO 8601 timestamp of last profile update |

---

## `/admins/{uid}`

Existence check only. If a document with the user's UID exists here, they have admin access. No fields are required.

---

## `/venues/{venueId}`

| Field | Type | Description |
|---|---|---|
| `name` | `string` | Venue display name |
| `type` | `'pickleball' \| 'box cricket'` | Sport type |
| `images` | `string[]` | Array of image URLs |
| `price` | `number` | Hourly rate in INR (₹) |
| `address` | `string` | Human-readable address |
| `distance` | `string` | Display string e.g. `"1.2 mi"` |
| `rating` | `number` | Star rating (0–5) |
| `amenities` | `string[]` | Material Symbols icon keys |
| `isPremium` | `boolean` | Premium badge flag |
| `lat` | `number?` | Latitude (optional) |
| `lng` | `number?` | Longitude (optional) |

---

## `/courts/{courtId}`

Each court belongs to one venue.

| Field | Type | Description |
|---|---|---|
| `venueId` | `string` | Parent venue document ID |
| `name` | `string` | Court display name e.g. `"Court 1"` |
| `surface` | `string` | Surface type e.g. `"Hard Court"` |
| `isIndoor` | `boolean` | `true` for indoor, `false` for outdoor |

---

## `/bookings/{bookingId}`

Created by the `verifyPayment` Cloud Function after successful payment.

| Field | Type | Description |
|---|---|---|
| `userId` | `string` | UID of the booking owner |
| `venueId` | `string` | Venue document ID |
| `courtId` | `string` | Court document ID |
| `date` | `string` | ISO date `YYYY-MM-DD` |
| `startTime` | `string` | 24-hour `HH:MM` |
| `endTime` | `string` | 24-hour `HH:MM` |
| `status` | `'confirmed' \| 'cancelled'` | Booking status |
| `amount` | `number` | Amount paid in INR |
| `razorpayOrderId` | `string` | Razorpay order ID |
| `razorpayPaymentId` | `string` | Razorpay payment ID |
| `createdAt` | `string` | ISO 8601 creation timestamp |

---

## Composite indexes (`firestore.indexes.json`)

| Collection | Fields | Purpose |
|---|---|---|
| `bookings` | `venueId ASC, courtId ASC, date ASC, status ASC` | TimeSlots conflict query |
| `bookings` | `userId ASC, status ASC, date ASC` | MyBookings + NotificationsPanel user-scoped queries |

---

## Security rules summary

See `firestore.rules` for the full rules. Key points:

- Only the authenticated owner can read/write their own `/users/{uid}` document.
- Only the authenticated owner can read their own bookings; bookings can only be written by the `verifyPayment` Cloud Function (server-side with Admin SDK — bypasses rules).
- Booking updates from the client are restricted to setting `status = 'cancelled'` on the owner's own bookings.
- Admin operations (venues, courts) require the caller's UID to exist in `/admins/{uid}`.
- Field-level validation enforces string lengths, phone format, and date/time patterns on client writes.
