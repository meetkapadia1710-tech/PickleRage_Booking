import type { Booking } from '../types';

export interface UserBooking extends Booking {
  price: number;
  createdAt: string;
}

const BOOKINGS_KEY = 'playhub_bookings';
const FAVORITES_KEY = 'playhub_favorites';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable (private mode etc.) — booking still works in-memory for the session
  }
}

// ---------- Bookings ----------

export function getUserBookings(): UserBooking[] {
  return read<UserBooking[]>(BOOKINGS_KEY, []);
}

export function getBookingById(id: string): UserBooking | undefined {
  return getUserBookings().find(b => b.id === id);
}

export function addBooking(
  input: Omit<UserBooking, 'id' | 'status' | 'createdAt'>
): UserBooking {
  const booking: UserBooking = {
    ...input,
    id: `PH-${Date.now().toString(36).toUpperCase()}`,
    status: 'confirmed',
    createdAt: new Date().toISOString(),
  };
  write(BOOKINGS_KEY, [...getUserBookings(), booking]);
  return booking;
}

export function cancelBooking(id: string): UserBooking[] {
  const next = getUserBookings().map(b =>
    b.id === id ? { ...b, status: 'cancelled' as const } : b
  );
  write(BOOKINGS_KEY, next);
  return next;
}

// ---------- Favorites ----------

export function getFavorites(): string[] {
  return read<string[]>(FAVORITES_KEY, []);
}

export function isFavorite(venueId: string): boolean {
  return getFavorites().includes(venueId);
}

export function toggleFavorite(venueId: string): boolean {
  const favs = getFavorites();
  const next = favs.includes(venueId)
    ? favs.filter(f => f !== venueId)
    : [...favs, venueId];
  write(FAVORITES_KEY, next);
  return next.includes(venueId);
}
