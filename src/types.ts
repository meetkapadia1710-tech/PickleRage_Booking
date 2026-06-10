export interface Venue {
  id: string;
  name: string;
  type: "pickleball" | "box cricket";
  images: string[];
  price: number;
  address: string;
  distance: string;
  rating: number;
  ratingCount?: number;
  amenities: string[];
  isPremium?: boolean;
  openHours?: string;
  highlights?: string[];
  offers?: {
    label: string;
    couponCode?: string;
    validTill?: string;
    terms?: string[];
  }[];
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
  squadSize?: string;   // e.g. "Full Court", "Half Court"
  sport?: string;       // e.g. "Pickleball", "Box Cricket"
}

export interface PayerDetail {
  uid: string;
  name: string;
  amount: number;
  paidAt: string;   // ISO timestamp
  photoURL?: string;
}

export interface SplitPayment {
  enabled: boolean;
  groupSize: number;
  mode: 'instant' | 'hold';
  sharePerPlayer: number;
  paidPlayers: string[];       // userIds of players who paid
  invitedFriends: string[];    // userIds of invited friends
  paymentLinkToken: string;    // unique token used in /split/:token route
  payerDetails?: PayerDetail[];// rich info: name + amount per payer
}

export interface Booking {
  id: string;
  userId: string;
  venueId: string;
  courtId: string;
  date: string;       // YYYY-MM-DD
  startTime: string;  // HH:mm
  endTime: string;    // HH:mm
  status: "confirmed" | "cancelled" | "hold";
  createdAt?: string;
  splitPayment?: SplitPayment;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  phone: string;
  photoURL?: string;
}

export interface FriendRequest {
  id: string;
  fromUid: string;
  toUid: string;
  fromName: string;
  fromPhone: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  fromPhotoURL?: string;
}
