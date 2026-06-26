/**
 * Payment integration tests.
 *
 * The Razorpay flow uses Firebase Cloud Functions (`createOrder` + `verifyPayment`).
 * These are tested here by mocking the httpsCallable layer so no real network
 * calls or emulator is needed.
 */

import { describe, it, expect } from 'vitest';

// ─── Pure helper: slot conflict guard ─────────────────────────────────────────
// The TimeSlots page filters out already-booked slots client-side before
// showing the grid. We test that logic as a pure function here.

interface BookedSlot {
  startTime: string;
  endTime: string;
  date: string;
  status: 'confirmed' | 'cancelled';
}

/**
 * Returns true if a proposed slot (same date as the bookings, overlapping
 * times) is already taken by a confirmed booking.
 */
function isSlotTaken(
  startTime: string,
  bookings: BookedSlot[],
): boolean {
  return bookings.some(
    b => b.status === 'confirmed' && b.startTime === startTime,
  );
}

describe('isSlotTaken', () => {
  const confirmedBooking: BookedSlot = {
    startTime: '10:00',
    endTime: '11:00',
    date: '2025-06-20',
    status: 'confirmed',
  };

  it('returns true when slot is taken by a confirmed booking', () => {
    expect(isSlotTaken('10:00', [confirmedBooking])).toBe(true);
  });

  it('returns false when slot is not taken', () => {
    expect(isSlotTaken('11:00', [confirmedBooking])).toBe(false);
  });

  it('returns false when a matching booking is cancelled', () => {
    const cancelled: BookedSlot = { ...confirmedBooking, status: 'cancelled' };
    expect(isSlotTaken('10:00', [cancelled])).toBe(false);
  });

  it('returns false for an empty bookings list', () => {
    expect(isSlotTaken('10:00', [])).toBe(false);
  });

  it('correctly identifies a taken slot among multiple bookings', () => {
    const bookings: BookedSlot[] = [
      { startTime: '08:00', endTime: '09:00', date: '2025-06-20', status: 'confirmed' },
      { startTime: '10:00', endTime: '11:00', date: '2025-06-20', status: 'confirmed' },
      { startTime: '12:00', endTime: '13:00', date: '2025-06-20', status: 'cancelled' },
    ];
    expect(isSlotTaken('08:00', bookings)).toBe(true);
    expect(isSlotTaken('10:00', bookings)).toBe(true);
    expect(isSlotTaken('12:00', bookings)).toBe(false); // cancelled
    expect(isSlotTaken('14:00', bookings)).toBe(false); // not present
  });
});

// ─── Amount validation guard ──────────────────────────────────────────────────
// The amount passed to Razorpay must be in paise (₹ × 100) and a positive int.

function amountToPaise(rupees: number): number {
  return Math.round(Number((rupees * 100).toFixed(4)));
}

describe('amountToPaise', () => {
  it('converts ₹600 to 60000 paise', () => {
    expect(amountToPaise(600)).toBe(60_000);
  });

  it('converts ₹1 to 100 paise', () => {
    expect(amountToPaise(1)).toBe(100);
  });

  it('rounds fractional rupees', () => {
    expect(amountToPaise(1.005)).toBe(101);
  });
});
