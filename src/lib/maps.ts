import type { Venue } from '../types';

/** Coordinates passed to Google Maps, preferring precise lat/lng over the address string. */
function destinationQuery(venue: Pick<Venue, 'lat' | 'lng' | 'address' | 'name'>): string {
  if (typeof venue.lat === 'number' && typeof venue.lng === 'number') {
    return `${venue.lat},${venue.lng}`;
  }
  // Prevent overly long query string for PickleRage from breaking the Maps pin
  if (venue.address && venue.address.includes('Picklerage, Shravan Chowkdi')) {
    return 'PickleRage, Bharuch';
  }
  // Anchor the address with the venue name so geocoding is less ambiguous.
  return [venue.name, venue.address].filter(Boolean).join(', ');
}

/** Whether we have a real location to point the map at. */
export function hasLocation(venue: Pick<Venue, 'lat' | 'lng' | 'address'>): boolean {
  return (typeof venue.lat === 'number' && typeof venue.lng === 'number') || !!venue.address?.trim();
}

/** Keyless embeddable Google Maps URL for an <iframe>. Works without an API key. */
export function getMapEmbedUrl(venue: Pick<Venue, 'lat' | 'lng' | 'address' | 'name'>): string {
  const q = encodeURIComponent(destinationQuery(venue));
  return `https://maps.google.com/maps?q=${q}&z=15&hl=en&output=embed`;
}

/** Turn-by-turn directions deep link. Opens the Maps app on mobile, Google Maps on web. */
export function getDirectionsUrl(venue: Pick<Venue, 'lat' | 'lng' | 'address' | 'name'>): string {
  const params = new URLSearchParams({ api: '1', destination: destinationQuery(venue) });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/** Open Google Maps showing a search for the given query (used for the "View map" overview). */
export function getMapSearchUrl(query: string): string {
  const params = new URLSearchParams({ api: '1', query });
  return `https://www.google.com/maps/search/?${params.toString()}`;
}

/**
 * Open a URL in the system browser / Maps app. Uses a transient anchor with
 * rel="noopener" so it behaves correctly inside the Capacitor Android WebView
 * as well as on the web.
 */
export function openExternal(url: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  a.remove();
}
