import type { Venue } from '../types';

export function sanitizeVenue(venue: Venue): Venue {
  const data = { ...venue };
  const id = data.id;

  if (id === 'venue_1') {
    data.name = 'PickleRage Pickleball';
    data.address = 'Picklerage, Shravan Chowkdi, Opposite Ganesh Township, Bholav, Bharuch 392001';
    data.images = ['/court-a.jpg', '/court-b.jpg'];
    if (!data.lat) {
      data.lat = 21.7196;
      data.lng = 73.0029;
    }
  } else if (id === 'venue_2') {
    data.name = 'Rooftop Pickleball';
    data.images = ['/city-center-1.jpg', '/city-center-2.jpg', '/rooftop-1.jpg', '/rooftop-2.jpg', '/rooftop-3.jpg'];
    if (!data.lat) {
      data.lat = 21.7051;
      data.lng = 72.9959;
    }
  } else if (id === 'venue_3') {
    data.name = 'SPORTS PLANET';
    data.address = 'City Centre, Railway Station Rd, Moficer Jin Compound, Bharuch, Gujarat 392001';
    data.images = ['/sports-planet-2.jpg', '/sports-planet-1.jpg'];
    if (!data.lat) {
      data.lat = 21.6963;
      data.lng = 72.9961;
    }
  }

  return data;
}
