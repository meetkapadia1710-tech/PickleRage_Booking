import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { formatTime, formatDate, endTimeOf } from '../format';

// ─── formatTime ───────────────────────────────────────────────────────────────

describe('formatTime', () => {
  it('formats midnight as 12:00 AM', () => {
    expect(formatTime('00:00')).toBe('12:00 AM');
  });

  it('formats noon as 12:00 PM', () => {
    expect(formatTime('12:00')).toBe('12:00 PM');
  });

  it('formats morning hours as AM', () => {
    expect(formatTime('09:00')).toBe('9:00 AM');
    expect(formatTime('09:30')).toBe('9:30 AM');
  });

  it('formats afternoon hours as PM', () => {
    expect(formatTime('13:00')).toBe('1:00 PM');
    expect(formatTime('17:45')).toBe('5:45 PM');
  });

  it('pads single-digit minutes with a leading zero', () => {
    expect(formatTime('10:05')).toBe('10:05 AM');
  });

  it('formats 23:00 as 11:00 PM', () => {
    expect(formatTime('23:00')).toBe('11:00 PM');
  });
});

// ─── formatDate ───────────────────────────────────────────────────────────────

describe('formatDate', () => {
  // Pin today's date so tests are deterministic regardless of when they run
  beforeEach(() => {
    vi.useFakeTimers();
    // Use 2025-06-15 (Sunday) as "today"
    vi.setSystemTime(new Date('2025-06-15T10:00:00'));
  });

  it('returns "Today" for today\'s date', () => {
    expect(formatDate('2025-06-15')).toBe('Today');
  });

  it('returns "Tomorrow" for tomorrow\'s date', () => {
    expect(formatDate('2025-06-16')).toBe('Tomorrow');
  });

  it('returns a locale string for dates further in the future', () => {
    const result = formatDate('2025-06-20');
    // Should not be "Today" or "Tomorrow"
    expect(result).not.toBe('Today');
    expect(result).not.toBe('Tomorrow');
    // Should include "Jun" or similar month representation
    expect(result).toMatch(/Jun/);
  });

  it('returns a locale string for past dates', () => {
    const result = formatDate('2025-06-01');
    expect(result).not.toBe('Today');
    expect(result).not.toBe('Tomorrow');
  });

  // Real timers restored by Vitest's afterEach automatically when useFakeTimers is used with vi.
  afterEach(() => {
    vi.useRealTimers();
  });
});

// ─── endTimeOf ────────────────────────────────────────────────────────────────

describe('endTimeOf', () => {
  it('adds exactly one hour to a morning slot', () => {
    expect(endTimeOf('09:00')).toBe('10:00');
  });

  it('adds exactly one hour to an evening slot', () => {
    expect(endTimeOf('20:00')).toBe('21:00');
  });

  it('pads single-digit hours with a leading zero', () => {
    expect(endTimeOf('08:00')).toBe('09:00');
  });

  it('handles hour 22 correctly', () => {
    expect(endTimeOf('22:00')).toBe('23:00');
  });
});
