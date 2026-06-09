import type { Booking } from '../types';

// Mock bookings to show some unavailable slots
export const mockBookings: Booking[] = [
  {
    id: "b1",
    userId: "u1",
    venueId: "venue_1",
    courtId: "c1",
    date: new Date().toISOString().split('T')[0], // Today
    startTime: "08:00",
    endTime: "09:00",
    status: "confirmed"
  },
  {
    id: "b2",
    userId: "u2",
    venueId: "venue_1",
    courtId: "c1",
    date: new Date().toISOString().split('T')[0], // Today
    startTime: "12:00",
    endTime: "13:00",
    status: "confirmed"
  },
  {
    id: "b3",
    userId: "u3",
    venueId: "venue_1",
    courtId: "c1",
    date: new Date().toISOString().split('T')[0], // Today
    startTime: "20:00",
    endTime: "21:00",
    status: "confirmed"
  },
  {
    id: "b4",
    userId: "u4",
    venueId: "venue_1",
    courtId: "c1",
    date: new Date().toISOString().split('T')[0], // Today
    startTime: "22:00",
    endTime: "23:00",
    status: "confirmed"
  }
];
