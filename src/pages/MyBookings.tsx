import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import type { Booking, Venue, Court } from '../types';

export default function MyBookings() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = async () => {
    if (!currentUser) return;
    try {
      // Fetch venues for lookup
      const venuesSnap = await getDocs(collection(db, 'venues'));
      const venuesList = venuesSnap.docs.map(doc => doc.data() as Venue);
      setVenues(venuesList);

      // Fetch courts for lookup
      const courtsSnap = await getDocs(collection(db, 'courts'));
      const courtsList = courtsSnap.docs.map(doc => doc.data() as Court);
      setCourts(courtsList);

      // Fetch user bookings
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('userId', '==', currentUser.uid)
      );
      const bookingsSnap = await getDocs(bookingsQuery);
      const bookingsList = bookingsSnap.docs.map(doc => doc.data() as Booking);
      
      setBookings(bookingsList);
    } catch (err) {
      console.error("Error fetching bookings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [currentUser]);

  const handleCancelBooking = async (bookingId: string) => {
    try {
      const bookingRef = doc(db, 'bookings', bookingId);
      await updateDoc(bookingRef, { status: 'cancelled' });
      // Refresh list
      await fetchBookings();
    } catch (err) {
      console.error("Error cancelling booking:", err);
      alert("Failed to cancel booking. Please try again.");
    }
  };

  const { upcomingBookings, pastBookings } = useMemo(() => {
    const now = new Date().getTime();
    const upcoming: Booking[] = [];
    const past: Booking[] = [];

    bookings.forEach(booking => {
      const bookingTime = new Date(`${booking.date}T${booking.startTime}`).getTime();
      // An upcoming booking is one in the future and NOT cancelled
      if (bookingTime >= now && booking.status !== 'cancelled') {
        upcoming.push(booking);
      } else {
        past.push(booking);
      }
    });

    // Sort upcoming desc (soonest first)
    upcoming.sort((a, b) => {
      const dateTimeA = new Date(`${a.date}T${a.startTime}`).getTime();
      const dateTimeB = new Date(`${b.date}T${b.startTime}`).getTime();
      return dateTimeA - dateTimeB;
    });

    // Sort past bookings desc (most recent first)
    past.sort((a, b) => {
      const dateTimeA = new Date(`${a.date}T${a.startTime}`).getTime();
      const dateTimeB = new Date(`${b.date}T${b.startTime}`).getTime();
      return dateTimeB - dateTimeA;
    });

    return { upcomingBookings: upcoming, pastBookings: past };
  }, [bookings]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="bg-background text-on-background min-h-screen pb-24 md:pb-0 pt-[72px]"
    >
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-background flex justify-between items-center px-5 h-[48px] border-b border-surface-variant/20">
        <div className="flex items-center gap-2 text-primary">
          <span className="material-symbols-outlined text-[24px]">sports_tennis</span>
          <span className="font-bold text-[24px]">PlayHub</span>
        </div>
        <button className="text-primary w-[48px] h-[48px] flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors active:scale-95 duration-100 cursor-pointer">
          <span className="material-symbols-outlined">notifications</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="px-5 max-w-3xl mx-auto mt-6">
        <div className="mb-6">
          <h1 className="font-bold text-[28px] md:text-[30px] text-primary mb-2">Bookings</h1>
          <p className="text-[14px] text-on-surface-variant">Manage your court reservations.</p>
        </div>

        {/* Tabs */}
        <div className="flex w-full mb-6 bg-surface-container-lowest p-1 rounded-xl shadow-[0_4px_12px_rgba(0,52,43,0.04)] relative">
          <div 
            className="absolute left-1 top-1 bottom-1 w-[calc(50%-0.25rem)] bg-primary rounded-lg transition-transform duration-300 ease-in-out" 
            style={{ transform: activeTab === 'upcoming' ? 'translateX(0)' : 'translateX(100%)' }}
          />
          <button 
            onClick={() => setActiveTab('upcoming')}
            className={`flex-1 relative z-10 h-[48px] flex items-center justify-center font-semibold text-[14px] transition-colors duration-200 cursor-pointer ${activeTab === 'upcoming' ? 'text-on-primary' : 'text-on-surface-variant hover:text-primary'}`}
          >
            Upcoming
          </button>
          <button 
            onClick={() => setActiveTab('past')}
            className={`flex-1 relative z-10 h-[48px] flex items-center justify-center font-semibold text-[14px] transition-colors duration-200 cursor-pointer ${activeTab === 'past' ? 'text-on-primary' : 'text-on-surface-variant hover:text-primary'}`}
          >
            Past
          </button>
        </div>

        {/* Tab Content */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <span className="material-symbols-outlined animate-spin text-[36px] text-primary">sync</span>
            </div>
          ) : activeTab === 'upcoming' ? (
            upcomingBookings.length === 0 ? (
              <div className="bg-surface-container-lowest rounded-[20px] p-8 text-center text-on-surface-variant font-medium border border-dashed border-outline-variant/30 px-6">
                No upcoming bookings. Book a court now!
              </div>
            ) : (
              upcomingBookings.map(booking => {
                const venue = venues.find(v => v.id === booking.venueId);
                const court = courts.find(c => c.id === booking.courtId);
                return (
                  <BookingCard 
                    key={booking.id}
                    booking={booking}
                    venue={venue}
                    court={court}
                    onCancel={() => handleCancelBooking(booking.id)}
                  />
                );
              })
            )
          ) : (
            pastBookings.length === 0 ? (
              <div className="bg-surface-container-lowest rounded-[20px] p-8 text-center text-on-surface-variant font-medium border border-dashed border-outline-variant/30 px-6">
                No past bookings found.
              </div>
            ) : (
              pastBookings.map(booking => {
                const venue = venues.find(v => v.id === booking.venueId);
                const court = courts.find(c => c.id === booking.courtId);
                return (
                  <PastBookingCard 
                    key={booking.id}
                    booking={booking}
                    venue={venue}
                    court={court}
                  />
                );
              })
            )
          )}
        </div>
      </main>
    </motion.div>
  );
}

function BookingCard({ 
  booking, 
  venue, 
  court, 
  onCancel 
}: { 
  booking: Booking, 
  venue: Venue | undefined, 
  court: Court | undefined, 
  onCancel: () => void 
}) {
  const isConfirmed = booking.status === "confirmed";
  
  const formattedDate = useMemo(() => {
    const bookingDate = new Date(`${booking.date}T00:00:00`);
    const today = new Date();
    today.setHours(0,0,0,0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    let dateStr = "";
    if (bookingDate.getTime() === today.getTime()) {
      dateStr = "Today";
    } else if (bookingDate.getTime() === tomorrow.getTime()) {
      dateStr = "Tomorrow";
    } else {
      dateStr = bookingDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    const [hour, min] = booking.startTime.split(':');
    const h = parseInt(hour);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 || 12;
    const timeStr = `${displayHour}:${min} ${ampm}`;

    return `${dateStr}, ${timeStr}`;
  }, [booking.date, booking.startTime]);

  return (
    <div className="bg-surface-container-lowest rounded-[20px] p-4 shadow-[0_4px_12px_rgba(0,52,43,0.04)] border border-transparent hover:border-primary/20 transition-all">
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md mb-2 ${isConfirmed ? 'bg-secondary-container/20 text-on-secondary-container' : 'bg-surface-container text-on-surface-variant'}`}>
            <span className="material-symbols-outlined text-[14px]">event</span>
            <span className="font-medium text-[12px]">{formattedDate}</span>
          </div>
          <h3 className="font-semibold text-[20px] text-primary">{venue?.name || booking.venueId}</h3>
          <p className="text-[14px] text-on-surface-variant">{court?.name || booking.courtId} • {court?.surface || 'Standard surface'}</p>
        </div>
        <div className={`px-3 py-1 rounded-full font-medium text-[12px] capitalize ${isConfirmed ? 'bg-secondary text-on-secondary' : 'bg-surface-container text-on-surface-variant'}`}>
          {booking.status}
        </div>
      </div>
      <div className="flex gap-2 mt-4 pt-4 border-t border-surface-container-high">
        {isConfirmed && (
          <button 
            onClick={onCancel}
            className="flex-1 h-[48px] bg-transparent text-error font-semibold text-[14px] border-[1.5px] border-error/20 rounded-full hover:bg-error/5 hover:border-error/50 transition-colors cursor-pointer"
          >
            Cancel Booking
          </button>
        )}
      </div>
    </div>
  );
}

function PastBookingCard({ 
  booking, 
  venue, 
  court 
}: { 
  booking: Booking, 
  venue: Venue | undefined, 
  court: Court | undefined 
}) {
  const formattedDate = useMemo(() => {
    const bookingDate = new Date(`${booking.date}T00:00:00`);
    const dateStr = bookingDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const [hour, min] = booking.startTime.split(':');
    const h = parseInt(hour);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 || 12;
    const timeStr = `${displayHour}:${min} ${ampm}`;

    return `${dateStr}, ${timeStr}`;
  }, [booking.date, booking.startTime]);

  const isCancelled = booking.status === 'cancelled';

  return (
    <div className="bg-surface-container-lowest rounded-[20px] p-4 shadow-[0_4px_12px_rgba(0,52,43,0.04)] opacity-80">
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="inline-flex items-center gap-1 text-on-surface-variant mb-2">
            <span className="material-symbols-outlined text-[14px]">history</span>
            <span className="font-medium text-[12px]">{formattedDate}</span>
          </div>
          <h3 className="font-semibold text-[20px] text-primary">{venue?.name || booking.venueId}</h3>
          <p className="text-[14px] text-on-surface-variant">{court?.name || booking.courtId} • {court?.surface || 'Standard surface'}</p>
        </div>
        <div className={`px-3 py-1 rounded-full font-medium text-[12px] capitalize ${isCancelled ? 'bg-error/10 text-error' : 'bg-surface-variant text-on-surface-variant'}`}>
          {isCancelled ? 'Cancelled' : 'Completed'}
        </div>
      </div>
    </div>
  );
}
