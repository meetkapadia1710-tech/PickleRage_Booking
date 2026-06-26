/**
 * Thin localStorage persistence layer for client-side preferences.
 *
 * Booking data lives exclusively in Firestore — never in localStorage.
 * Only lightweight user preferences (favourites) are persisted here.
 */

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
    // storage unavailable (private mode etc.) — preferences silently no-op
  }
}

// ── Favourites ────────────────────────────────────────────────────────────────

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
