import type { Venue, Court } from '../types';

export const mockVenues: Venue[] = [
  {
    id: "venue_1",
    name: "PickleRage Pickleball at Shravan Chokdi",
    type: "pickleball",
    images: ["https://lh3.googleusercontent.com/aida-public/AB6AXuAfrKLO4vIYaVf-hotizWYDN9YXfbPDgdpxt0Uy8DynrBzcMOWRKE8ZeCzBVpXxMM2YTb_HhwcA4kUHTEYPd0x9aLRnTJTofK33R4_VOmg2d3EsReKk8ArQbkg5jLdAIP8fYaS73LlqNV5zPqQ3someJW9QxJ5mIxFdX3af_feF6FVRfwaE3TKw7VASQ0EAzeWO-Z7yQzTWWGnM1L5nLFZTmoEF-cILvtqduPgT9SzQkPF8aAyzP4dZNOo3Vc1NRTip4X0hEuCR_zU"],
    price: 600,
    address: "1200 Baseline Road, Downtown District",
    distance: "1.2 mi",
    rating: 4.9,
    amenities: ["local_parking", "shower", "lock", "water_drop", "storefront"],
    isPremium: true
  },
  {
    id: "venue_2",
    name: "PickleRage Pickleball at City Center",
    type: "pickleball",
    images: ["https://lh3.googleusercontent.com/aida-public/AB6AXuBG4BC1nXZgoqd37ZqdL-4OsZjBgc7xU0JmOR-5eV40r2HtJMlVNAEoy-f81SX8H6LLto-2TAHCPb2i_xbJsPh9UIov_Bp0d074696d4fmeBYqDYqz7JD8S-01KVCGNMs6ZgngORmi_VYnVJiU6AoceAlHQWYcu3PjSh_Mup12mOTx6VCAAT8X8sv04VsRXG0XaPnuJNawDrv8yzxiTz1HTWXtYpImlXAmJhsdKXOdNzpcMufcZWS6ZnObR0phh2XUfhqrVYM49VM8"],
    price: 800,
    address: "88 Riverfront Ave, Westside",
    distance: "2.5 mi",
    rating: 4.7,
    amenities: ["local_parking", "water_drop"],
    isPremium: false
  },
  {
    id: "venue_3",
    name: "City Center Box Cricket",
    type: "box cricket",
    images: ["https://lh3.googleusercontent.com/aida-public/AB6AXuCKFWDwUkJOC1ABRjsh3SwFIK6rFX_5A6kgUHwc1e7MZrgIh339YcdYsqPyQEsYjYj9pEPRHdY-CvtctpSe04An-dj9lFxEgix1ZZtzt79nJzhK_qofld5ufuawior8yrUeGEjegfByPbbaBRtlbCZp-_AjHSEZi025nGsYEOXXjqhq_PMWBzeR3aaJIMY5i8pXqBwW-zJpOMO-OEiYsLxAhapu6Y3Gvp8soyfttVQfJePJTY_lBLasjc2oGXZL8tZ5bXZZAhxzVNY"],
    price: 1000,
    address: "45 Strike Zone, North Hub",
    distance: "3.0 mi",
    rating: 4.8,
    amenities: ["local_parking", "shower", "storefront"],
    isPremium: true
  }
];

export const mockCourts: Court[] = [
  { id: "c1", venueId: "venue_1", name: "Court 1", surface: "Hard Court", isIndoor: true },
  { id: "c2", venueId: "venue_1", name: "Court 2", surface: "Hard Court", isIndoor: true },
  { id: "c3", venueId: "venue_2", name: "Court A", surface: "Outdoor", isIndoor: false },
  { id: "c4", venueId: "venue_3", name: "Turf 1", surface: "Astro Turf", isIndoor: true },
];
