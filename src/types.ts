export interface Venue {
  id: string;
  name: string;
  type: "pickleball" | "box cricket";
  images: string[];
  price: number;
  address: string;
  distance: string;
  rating: number;
  amenities: string[];
  isPremium?: boolean;
  /** Optional precise map coordinates. When absent, the address is geocoded by Google Maps. */
  lat?: number;
  lng?: number;
}

export interface Court {
  id: string;
  venueId: string;
  name: string;
  surface: string;
  isIndoor: boolean;
  priceModifier?: number;
}

export interface Booking {
  id: string;
  userId: string;
  venueId: string;
  courtId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  status: "confirmed" | "cancelled";
}
