import type { Venue, Court } from '../types';

export const mockVenues: Venue[] = [
  {
    id: "venue_1",
    name: "PickleRage Pickleball",
    type: "pickleball",
    images: ["/court-a.jpg", "/court-b.jpg"],
    price: 200,
    address: "Picklerage, Shravan Chowkdi, Opposite Ganesh Township, Bholav, Bharuch 392001",
    distance: "1.2 mi",
    rating: 3.9,
    ratingCount: 12,
    openHours: "6:00 AM – 11:59 PM",
    amenities: ["water_drop", "local_parking", "emergency", "wb_incandescent", "storefront", "sports_tennis"],
    highlights: ["Free Equipment", "Free Paddles"],
    offers: [
      {
        label: "20% off upto ₹75",
        couponCode: "GJ@75",
        validTill: "31st Dec, 2026",
        terms: [
          "The discount will be applicable on the buying price excluding taxes.",
          "Minimum Cart value should be Rs 400 for the coupon application.",
          "A maximum Discount of Rs. 75 can be availed on your first booking.",
          "Coupon is valid till 31st Dec, 2026.",
          "PickleRage reserves the rights to make changes or remove the coupon from the platform at any point of time."
        ]
      }
    ],
    isPremium: true,
    lat: 21.7196,
    lng: 73.0029
  },
  {
    id: "venue_2",
    name: "Rooftop Pickleball",
    type: "pickleball",
    images: ["https://lh3.googleusercontent.com/aida-public/AB6AXuBG4BC1nXZgoqd37ZqdL-4OsZjBgc7xU0JmOR-5eV40r2HtJMlVNAEoy-f81SX8H6LLto-2TAHCPb2i_xbJsPh9UIov_Bp0d074696d4fmeBYqDYqz7JD8S-01KVCGNMs6ZgngORmi_VYnVJiU6AoceAlHQWYcu3PjSh_Mup12mOTx6VCAAT8X8sv04VsRXG0XaPnuJNawDrv8yzxiTz1HTWXtYpImlXAmJhsdKXOdNzpcMufcZWS6ZnObR0phh2XUfhqrVYM49VM8"],
    price: 800,
    address: "88 Riverfront Ave, Westside",
    distance: "2.5 mi",
    rating: 4.7,
    amenities: ["local_parking", "water_drop"],
    isPremium: false,
    lat: 21.7051,
    lng: 72.9959
  },
  {
    id: "venue_3",
    name: "SPORTS PLANET",
    type: "box cricket",
    images: ["https://lh3.googleusercontent.com/aida-public/AB6AXuCKFWDwUkJOC1ABRjsh3SwFIK6rFX_5A6kgUHwc1e7MZrgIh339YcdYsqPyQEsYjYj9pEPRHdY-CvtctpSe04An-dj9lFxEgix1ZZtzt79nJzhK_qofld5ufuawior8yrUeGEjegfByPbbaBRtlbCZp-_AjHSEZi025nGsYEOXXjqhq_PMWBzeR3aaJIMY5i8pXqBwW-zJpOMO-OEiYsLxAhapu6Y3Gvp8soyfttVQfJePJTY_lBLasjc2oGXZL8tZ5bXZZAhxzVNY"],
    price: 1000,
    address: "City Centre, Railway Station Rd, Moficer Jin Compound, Bharuch, Gujarat 392001",
    distance: "3.0 mi",
    rating: 4.8,
    amenities: ["local_parking", "shower", "storefront"],
    isPremium: true,
    lat: 21.6963,
    lng: 72.9961
  }
];

export const mockCourts: Court[] = [
  { id: "c1", venueId: "venue_1", name: "Court 1", surface: "Hard Court", isIndoor: true, squadSize: "Full Court", sport: "Pickleball" },
  { id: "c2", venueId: "venue_1", name: "Court 2", surface: "Hard Court", isIndoor: true, squadSize: "Full Court", sport: "Pickleball" },
  { id: "c3", venueId: "venue_2", name: "Court A", surface: "Outdoor", isIndoor: false, squadSize: "Full Court", sport: "Pickleball" },
  { id: "c4", venueId: "venue_3", name: "Turf 1", surface: "Astro Turf", isIndoor: true, squadSize: "Full Court", sport: "Box Cricket" },
];
