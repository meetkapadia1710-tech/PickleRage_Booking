import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { doc, getDoc, collection, query, where, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useAndroidBackClose } from '../lib/backClose';
import { logger } from '../lib/logger';
import { payWithRazorpay } from '../lib/razorpay';
import type { Venue, Court, Booking } from '../types';

// Local (not UTC) YYYY-MM-DD so "today" and slot dates match the user's clock.
const toLocalIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function TimeSlots() {
  const { id: venueId, courtId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [venue, setVenue] = useState<Venue | null>(null);
  const [court, setCourt] = useState<Court | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedDate, setSelectedDate] = useState(() => toLocalIso(new Date()));
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  // Android back closes the confirmation sheet instead of leaving the page
  useAndroidBackClose(isConfirming, () => setIsConfirming(false));
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch venue and court details
  useEffect(() => {
    const fetchDetails = async () => {
      if (!venueId || !courtId) return;
      try {
        const venueSnap = await getDoc(doc(db, 'venues', venueId));
        if (venueSnap.exists()) setVenue({ ...(venueSnap.data() as Venue), id: venueSnap.id });
        if (courtId === 'venue_2_c1') {
          setCourt({ id: 'venue_2_c1', venueId: 'venue_2', name: 'Court 1', surface: 'Outdoor', isIndoor: false, squadSize: 'Full Court', sport: 'Pickleball' });
        } else if (courtId === 'venue_2_c2') {
          setCourt({ id: 'venue_2_c2', venueId: 'venue_2', name: 'Court 2', surface: 'Outdoor', isIndoor: false, squadSize: 'Full Court', sport: 'Pickleball' });
        } else {
          const courtSnap = await getDoc(doc(db, 'courts', courtId));
          if (courtSnap.exists()) setCourt({ ...(courtSnap.data() as Court), id: courtSnap.id });
        }
      } catch (err) {
        logger.error('TimeSlots: error fetching slot details', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [venueId, courtId]);

  // Real-time listener for confirmed bookings on the selected date
  useEffect(() => {
    if (!venueId || !courtId || !selectedDate) return;
    const bookingsQuery = query(
      collection(db, 'bookings'),
      where('venueId', '==', venueId),
      where('courtId', '==', courtId),
      where('date', '==', selectedDate),
      where('status', '==', 'confirmed'),
    );
    return onSnapshot(bookingsQuery, snapshot => {
      setBookings(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Booking)));
    });
  }, [venueId, courtId, selectedDate]);

  const dates = useMemo(() => {
    const arr = [];
    const today = new Date();
    for (let i = 0; i < 5; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      arr.push({
        iso: toLocalIso(d),
        dayOfWeek: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dayOfMonth: d.getDate(),
      });
    }
    return arr;
  }, []);

  const isSlotAvailable = (time: string) => {
    if (bookings.find(b => b.startTime === time)) return false;
    // Can't book a slot whose start hour has already passed today.
    if (selectedDate === toLocalIso(new Date())) {
      const slotHour = parseInt(time.split(':')[0], 10);
      if (slotHour <= new Date().getHours()) return false;
    }
    return true;
  };

  const handleSlotClick = (time: string) => {
    if (isSlotAvailable(time)) setSelectedSlot(time);
  };

  const handleConfirmBooking = async () => {
    if (!currentUser || !venue || !court || !selectedSlot || isSubmitting) return;

    // Re-check availability right before writing.
    if (!isSlotAvailable(selectedSlot)) {
      alert('Sorry, that slot was just taken. Please choose another time.');
      setIsConfirming(false);
      setSelectedSlot(null);
      return;
    }

    setIsSubmitting(true);
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch { /* ignore */ }

    try {
      const startHour = parseInt(selectedSlot.split(':')[0]);
      const endTime = `${(startHour + 1).toString().padStart(2, '0')}:00`;
      const bookingRef = doc(collection(db, 'bookings'));

      // Fetch booker's display name for the payment prefill
      const userSnap = await getDoc(doc(db, 'users', currentUser.uid));
      const payerName = userSnap.exists()
        ? (userSnap.data().displayName as string) || currentUser.displayName || 'Player'
        : currentUser.displayName || 'Player';

      // Collect payment first — if cancelled or failed, no booking is created.
      await payWithRazorpay({
        amountRupees: venue.price,
        receipt: `book_${bookingRef.id}`.slice(0, 40),
        description: `${venue.name} — ${court.name}`,
        prefill: { name: payerName, email: currentUser.email ?? undefined },
      });

      const bookingData: Omit<Booking, 'id'> = {
        userId: currentUser.uid,
        venueId: venue.id,
        courtId: court.id,
        date: selectedDate,
        startTime: selectedSlot,
        endTime,
        status: 'confirmed',
        createdAt: new Date().toISOString(),
      };

      await setDoc(bookingRef, { id: bookingRef.id, ...bookingData });
      navigate(`/payment-success/${bookingRef.id}`);
    } catch (err: unknown) {
      logger.error('TimeSlots: error creating booking', err);
      const msg = err instanceof Error ? err.message : 'Please try again.';
      if (msg !== 'Payment cancelled.') alert(`Booking failed: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-[48px] text-primary">sync</span>
      </div>
    );
  }

  if (!venue || !court) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <span className="material-symbols-outlined text-[64px] text-error mb-4">error</span>
        <h1 className="text-2xl font-bold text-on-background mb-4">Data Not Found</h1>
        <button onClick={() => navigate('/home')} className="bg-primary text-on-primary px-6 py-2.5 rounded-full font-semibold cursor-pointer">Back to Home</button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="bg-background text-on-background min-h-screen flex flex-col"
    >
      {/* TopAppBar */}
      <header className="bg-background w-full top-0 sticky z-40 pt-[env(safe-area-inset-top)] border-b border-surface-variant/10">
        <div className="flex justify-between items-center px-5 h-[48px] w-full max-w-3xl md:max-w-5xl lg:max-w-6xl xl:max-w-7xl mx-auto">
          <button onClick={() => navigate(-1)} aria-label="Go back" className="flex items-center justify-center hover:bg-surface-container-high transition-colors rounded-full p-1 cursor-pointer text-primary">
            <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
          </button>
          <h1 className="font-bold text-[24px] text-primary">PlayHub</h1>
          <div className="w-8" />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-[100px] animate-fadeIn">
        <div className="max-w-3xl md:max-w-5xl lg:max-w-6xl xl:max-w-7xl mx-auto px-5 pt-6">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start w-full">
            {/* Left Column: Context Header & Date Selector */}
            <div className="flex flex-col w-full lg:w-[320px] shrink-0 gap-5">
              {/* Context Header Card */}
              <div className="bg-surface-container-lowest border border-outline-variant/65 p-5 rounded-3xl shadow-[0_8px_30px_rgba(0,52,43,0.04)] flex flex-col gap-2">
                <h2 className="font-extrabold text-[22px] text-on-background tracking-tight">Select Time</h2>
                <div className="flex items-center text-on-surface-variant gap-2 text-[13px] font-semibold">
                  <span className="material-symbols-outlined text-[18px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {venue.type === 'pickleball' ? 'sports_tennis' : 'sports_cricket'}
                  </span>
                  <span>{venue.name.split(',')[0]} • {court.name}</span>
                </div>
              </div>

              {/* Date Selector Card */}
              <div className="bg-surface-container-lowest border border-outline-variant/65 p-5 rounded-3xl shadow-[0_8px_30px_rgba(0,52,43,0.04)] flex flex-col gap-3">
                <h3 className="font-extrabold text-[13px] uppercase tracking-wider text-on-surface-variant px-1 mb-1">Select Date</h3>
                <div className="flex lg:flex-col overflow-x-auto lg:overflow-x-visible gap-3 pb-2 lg:pb-0 hide-scrollbar snap-x">
                  {dates.map(d => {
                    const isSelected = selectedDate === d.iso;
                    return (
                      <button
                        key={d.iso}
                        onClick={() => { setSelectedDate(d.iso); setSelectedSlot(null); }}
                        className={`flex flex-col lg:flex-row items-center justify-center lg:justify-between min-w-[60px] lg:min-w-0 lg:w-full h-[72px] lg:h-[56px] px-2 lg:px-4 rounded-xl lg:rounded-2xl snap-start relative transition-colors cursor-pointer border ${
                          isSelected
                            ? 'bg-primary text-on-primary border-primary shadow-[0_4px_12px_rgba(0,52,43,0.15)]'
                            : 'bg-surface-container-low text-on-surface border-transparent hover:bg-surface-container-high'
                        }`}
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center gap-1 lg:gap-3 text-center lg:text-left">
                          <span className="font-bold text-[12px] uppercase tracking-wider">{d.dayOfWeek}</span>
                          <span className="font-extrabold text-[20px] lg:text-[17px] leading-none">{d.dayOfMonth}</span>
                        </div>
                        {isSelected && (
                          <div className="absolute bottom-1 lg:static w-1.5 h-1.5 rounded-full bg-secondary-container lg:bg-on-primary" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column: Time Slot Sections */}
            <div className="bg-surface-container-lowest border border-outline-variant/65 p-6 rounded-3xl shadow-[0_8px_30px_rgba(0,52,43,0.04)] flex flex-col gap-6 w-full lg:flex-1">
              <div className="space-y-6">
                <SlotSection title="Morning Slots" icon="light_mode" slots={["06:00","07:00","08:00","09:00","10:00","11:00"]}
                  selectedSlot={selectedSlot} isSlotAvailable={isSlotAvailable} handleSlotClick={handleSlotClick} />
                <hr className="border-outline-variant/20" />
                <SlotSection title="Afternoon Slots" icon="wb_sunny" slots={["12:00","13:00","14:00","15:00","16:00","17:00"]}
                  selectedSlot={selectedSlot} isSlotAvailable={isSlotAvailable} handleSlotClick={handleSlotClick} />
                <hr className="border-outline-variant/20" />
                <SlotSection title="Evening Slots" icon="nights_stay" slots={["18:00","19:00","20:00","21:00","22:00"]}
                  selectedSlot={selectedSlot} isSlotAvailable={isSlotAvailable} handleSlotClick={handleSlotClick} />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Floating Action Area */}
      {selectedSlot && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="fixed bottom-0 w-full z-50 bg-surface-container-lowest shadow-[0_-4px_20px_rgba(0,52,43,0.08)] pb-safe"
        >
          <div className="max-w-3xl md:max-w-5xl lg:max-w-6xl xl:max-w-7xl mx-auto px-5 py-4 flex justify-between items-center">
            <div>
              <p className="font-medium text-[12px] text-on-surface-variant">Selected</p>
              <p className="font-semibold text-[20px] text-primary">
                {selectedSlot} – {(parseInt(selectedSlot.split(':')[0]) + 1).toString().padStart(2, '0')}:00
              </p>
            </div>
            <button
              onClick={() => setIsConfirming(true)}
              className="h-[48px] px-8 rounded-full bg-secondary-container text-on-secondary-container font-semibold text-[14px] flex items-center justify-center shadow-[0_4px_12px_rgba(255,191,0,0.2)] hover:opacity-90 active:scale-95 transition-all cursor-pointer"
            >
              Confirm Selection
            </button>
          </div>
        </motion.div>
      )}

      {/* Booking Confirmation Sheet */}
      <AnimatePresence>
        {isConfirming && selectedSlot && (
          <div className="fixed inset-0 z-[100] flex flex-col justify-end">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsConfirming(false)}
              className="absolute inset-0 bg-on-background/30 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              role="dialog"
              aria-modal="true"
              aria-label="Confirm Booking"
              className="relative w-full bg-surface-container-lowest rounded-t-[24px] shadow-[0_-8px_20px_rgba(0,52,43,0.08)] flex flex-col pb-safe max-h-[92vh] overflow-y-auto"
            >
              {/* Drag Handle */}
              <div className="w-full flex justify-center pt-2 pb-2">
                <div className="w-12 h-1.5 bg-surface-variant rounded-full" />
              </div>

              {/* Sheet Header */}
              <div className="px-5 pb-2 flex items-center justify-between sticky top-0 bg-surface-container-lowest z-10">
                <h2 className="font-semibold text-[20px] text-on-surface">Confirm Booking</h2>
                <button
                  onClick={() => setIsConfirming(false)}
                  aria-label="Close booking confirmation"
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container hover:bg-surface-variant transition-colors text-on-surface-variant cursor-pointer"
                >
                  <span className="material-symbols-outlined" aria-hidden="true">close</span>
                </button>
              </div>

              <div className="px-5 flex flex-col gap-5 pb-6">
                {/* Venue Summary */}
                <div className="flex gap-4 bg-surface p-2 rounded-[16px] border border-outline-variant/30">
                  <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 bg-surface-variant">
                    <img src={venue.images[0] ?? ''} alt={venue.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col justify-center">
                    <h3 className="font-semibold text-[14px] text-on-surface mb-1">{venue.name}</h3>
                    <p className="text-[13px] text-on-surface-variant mb-2">{court.name} • {court.surface}</p>
                    <div className="flex items-center gap-1 text-amber-500">
                      <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      <span className="font-medium text-[12px] text-on-surface">{venue.rating}</span>
                      {venue.ratingCount && <span className="text-[11px] text-on-surface-variant">({venue.ratingCount})</span>}
                    </div>
                  </div>
                </div>

                {/* Booking Details Grid */}
                <div className="grid grid-cols-2 gap-4 bg-surface-container-low p-4 rounded-[16px]">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 text-primary"><span className="material-symbols-outlined">calendar_today</span></div>
                    <div>
                      <p className="font-medium text-[12px] text-on-surface-variant uppercase tracking-wider mb-0.5">Date</p>
                      <p className="font-semibold text-[14px] text-on-surface">
                        {new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 text-primary"><span className="material-symbols-outlined">schedule</span></div>
                    <div>
                      <p className="font-medium text-[12px] text-on-surface-variant uppercase tracking-wider mb-0.5">Time</p>
                      <p className="font-semibold text-[14px] text-on-surface">
                        {selectedSlot} – {(parseInt(selectedSlot.split(':')[0]) + 1).toString().padStart(2, '0')}:00
                      </p>
                    </div>
                  </div>
                </div>

                {/* Price Summary */}
                <div className="flex flex-col gap-2 pt-1 border-t border-surface-variant">
                  <h4 className="font-semibold text-[14px] text-on-surface mb-1">Payment Summary</h4>
                  <div className="flex justify-between items-center">
                    <span className="text-[14px] text-on-surface-variant">Court Fee (1 hr)</span>
                    <span className="text-[14px] text-on-surface">₹{venue.price}.00</span>
                  </div>
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-surface-variant border-dashed">
                    <span className="font-semibold text-[18px] text-on-surface">Total</span>
                    <span className="font-bold text-[20px] text-primary">₹{venue.price}.00</span>
                  </div>
                </div>

                {/* Action Button */}
                <button
                  onClick={handleConfirmBooking}
                  disabled={isSubmitting}
                  className={`w-full h-[52px] bg-secondary-container text-primary rounded-full font-semibold text-[15px] flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm cursor-pointer ${isSubmitting ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-90'}`}
                >
                  {isSubmitting
                    ? <span className="material-symbols-outlined animate-spin">sync</span>
                    : <span className="material-symbols-outlined">lock</span>}
                  {isSubmitting ? 'Processing…' : 'Pay & Book'}
                </button>

                <p className="text-center font-medium text-[12px] text-on-surface-variant">
                  By booking, you agree to our <a href="#" className="text-primary underline decoration-primary/30 underline-offset-2">Cancellation Policy</a>
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function SlotSection({
  title, icon, slots, selectedSlot, isSlotAvailable, handleSlotClick
}: {
  title: string; icon: string; slots: string[];
  selectedSlot: string | null;
  isSlotAvailable: (t: string) => boolean;
  handleSlotClick: (t: string) => void;
}) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <span className="material-symbols-outlined text-primary">{icon}</span>
        <h3 className="font-semibold text-[20px] text-primary">{title}</h3>
      </div>
      <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
        {slots.map(time => {
          const available = isSlotAvailable(time);
          const isSelected = selectedSlot === time;
          return (
            <button
              key={time}
              onClick={() => handleSlotClick(time)}
              disabled={!available}
              className={`h-[48px] rounded-[12px] font-semibold text-[14px] flex items-center justify-center border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-primary text-on-primary border-primary'
                  : available
                    ? 'bg-surface-container text-on-surface border-transparent hover:border-primary/50'
                    : 'bg-surface-variant text-on-surface-variant opacity-40 cursor-not-allowed border-transparent'
              }`}
            >
              {!available ? <span className="line-through">{time}</span> : time}
            </button>
          );
        })}
      </div>
    </section>
  );
}
