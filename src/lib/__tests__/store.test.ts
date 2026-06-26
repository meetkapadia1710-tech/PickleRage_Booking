import { describe, it, expect, beforeEach } from 'vitest';
import { getFavorites, isFavorite, toggleFavorite } from '../store';

// ─── Favourites (localStorage-backed) ────────────────────────────────────────
// jsdom provides a real in-memory localStorage; we clear it before each test
// so tests are fully isolated from each other.

describe('getFavorites', () => {
  beforeEach(() => localStorage.clear());

  it('returns an empty array when localStorage is empty', () => {
    expect(getFavorites()).toEqual([]);
  });

  it('returns existing favourites from localStorage', () => {
    localStorage.setItem('playhub_favorites', JSON.stringify(['venue_1', 'venue_2']));
    expect(getFavorites()).toEqual(['venue_1', 'venue_2']);
  });

  it('returns empty array when localStorage value is corrupted JSON', () => {
    localStorage.setItem('playhub_favorites', 'NOT_JSON');
    expect(getFavorites()).toEqual([]);
  });
});

describe('isFavorite', () => {
  beforeEach(() => localStorage.clear());

  it('returns false for an unknown venue', () => {
    expect(isFavorite('venue_99')).toBe(false);
  });

  it('returns true for a stored favourite', () => {
    localStorage.setItem('playhub_favorites', JSON.stringify(['venue_1']));
    expect(isFavorite('venue_1')).toBe(true);
  });

  it('returns false for a venue not in the favourites list', () => {
    localStorage.setItem('playhub_favorites', JSON.stringify(['venue_1']));
    expect(isFavorite('venue_2')).toBe(false);
  });
});

describe('toggleFavorite', () => {
  beforeEach(() => localStorage.clear());

  it('adds a venue and returns true', () => {
    const result = toggleFavorite('venue_1');
    expect(result).toBe(true);
    expect(getFavorites()).toContain('venue_1');
  });

  it('removes a venue that is already favourited and returns false', () => {
    localStorage.setItem('playhub_favorites', JSON.stringify(['venue_1']));
    const result = toggleFavorite('venue_1');
    expect(result).toBe(false);
    expect(getFavorites()).not.toContain('venue_1');
  });

  it('does not affect other favourites when removing one', () => {
    localStorage.setItem('playhub_favorites', JSON.stringify(['venue_1', 'venue_2']));
    toggleFavorite('venue_1');
    expect(getFavorites()).toEqual(['venue_2']);
  });

  it('toggles back to added after two calls', () => {
    toggleFavorite('venue_1');            // add
    toggleFavorite('venue_1');            // remove
    const result = toggleFavorite('venue_1'); // add again
    expect(result).toBe(true);
    expect(getFavorites()).toContain('venue_1');
  });
});
