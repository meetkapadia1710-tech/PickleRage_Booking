import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { doc, getDoc, collection, query, where, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import type { Venue, Court, Booking } from '../types';

export default function TimeSlots() {
  const { id: venueId, courtId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [venue, setVenue] = useState<Venue | null>(null);
  const [court, setCourt] = useState<Court | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  // Fetch venue and court details
  useEffect(() => {
    const fetchDetails = async () => {
      if (!venueId || !courtId) return;
      try {
        const venueSnap = await getDoc(doc(db, 'venues', venueId));
        if (venueSnap.exists()) {
          setVenue(venueSnap.data() as Venue);
        }
        const courtSnap = await getDoc(doc(db, 'courts', courtId));
        if (courtSnap.exists()) {
          setCourt(courtSnap.data() as Court);
        }
      } catch (err) {
        console.error("Error fetching slot details:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [venueId, courtId]);

  // Set up real-time listener for bookings
  useEffect(() => {
    if (!venueId || !courtId || !selectedDate) return;

    const bookingsQuery = query(
      collection(db, 'bookings'),
      where('venueId', '==', venueId),
      where('courtId', '==', courtId),
      where('date', '==', selectedDate),
      where('status', '==', 'confirmed')
    );

    const unsubscribe = onSnapshot(bookingsQuery, (snapshot) => {
      const bookingsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Booking));
      setBookings(bookingsList);
    });

    return unsubscribe;
  }, [venueId, courtId, selectedDate]);

  // Generate 5 days of dates
  const dates = useMemo(() => {
    const arr = [];
    const today = new Date();
    for (let i = 0; i < 5; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      arr.push({
        iso: d.toISOString().split('T')[0],
        dayOfWeek: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dayOfMonth: d.getDate()
      });
    }
    return arr;
  }, []);

  // Filter slots to determine availability
  const isSlotAvailable = (time: string) => {
    const booking = bookings.find(b => b.startTime === time);
    return !booking;
  };

  const handleSlotClick = (time: string) => {
    if (isSlotAvailable(time)) {
      setSelectedSlot(time);
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
      <header className="bg-background w-full top-0 sticky z-40">
        <div className="flex justify-between items-center px-5 h-[48px] w-full">
          <button onClick={() => navigate(-1)} className="flex items-center justify-center hover:bg-surface-container-high transition-colors rounded-full p-1 cursor-pointer text-primary">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="font-bold text-[24px] text-primary">PlayHub</h1>
          <div className="flex items-center gap-2 text-on-surface-variant">
            <span className="material-symbols-outlined cursor-pointer hover:bg-surface-container-high transition-colors rounded-full p-1">notifications</span>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-[100px]">
        <div className="max-w-3xl mx-auto px-5 pt-4">
          {/* Context Header */}
          <div className="mb-6">
            <h2 className="font-bold text-[28px] text-primary mb-2">Select Time</h2>
            <div className="flex items-center text-on-surface-variant gap-2 text-[14px]">
              <span className="material-symbols-outlined text-[18px]">
                {venue.type === 'pickleball' ? 'sports_tennis' : 'sports_cricket'}
              </span>
              <span>{venue.name.split(',')[0]} • {court.name}</span>
            </div>
          </div>

          {/* Date Scroller */}
          <div className="mb-6 flex overflow-x-auto gap-4 pb-2 hide-scrollbar snap-x">
            {dates.map((d) => {
              const isSelected = selectedDate === d.iso;
              return (
                <button 
                  key={d.iso}
                  onClick={() => {
                    setSelectedDate(d.iso);
                    setSelectedSlot(null); // reset slot on date change
                  }}
                  className={`flex flex-col items-center justify-center min-w-[60px] h-[72px] rounded-xl snap-start relative transition-colors cursor-pointer ${
                    isSelected 
                      ? 'bg-primary text-on-primary shadow-[0_4px_12px_rgba(0,52,43,0.15)]' 
                      : 'bg-surface-container-low text-on-surface hover:bg-surface-container-high'
                  }`}
                >
                  <span className="font-medium text-[12px] uppercase">{d.dayOfWeek}</span>
                  <span className="font-semibold text-[20px] mt-1">{d.dayOfMonth}</span>
                  {isSelected && (
                    <div className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-secondary-container"></div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Slots Container */}
          <div className="space-y-6">
            <SlotSection 
              title="Morning" 
              icon="light_mode" 
              slots={["06:00", "07:00", "08:00", "09:00", "10:00", "11:00"]} 
              selectedSlot={selectedSlot}
              isSlotAvailable={isSlotAvailable}
              handleSlotClick={handleSlotClick}
            />
            <SlotSection 
              title="Afternoon" 
              icon="wb_sunny" 
              slots={["12:00", "13:00", "14:00", "15:00", "16:00", "17:00"]} 
              selectedSlot={selectedSlot}
              isSlotAvailable={isSlotAvailable}
              handleSlotClick={handleSlotClick}
            />
            <SlotSection 
              title="Evening" 
              icon="nights_stay" 
              slots={["18:00", "19:00", "20:00", "21:00", "22:00"]} 
              selectedSlot={selectedSlot}
              isSlotAvailable={isSlotAvailable}
              handleSlotClick={handleSlotClick}
            />
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
          <div className="max-w-3xl mx-auto px-5 py-4 flex justify-between items-center">
            <div>
              <p className="font-medium text-[12px] text-on-surface-variant">Selected</p>
              <p className="font-semibold text-[20px] text-primary">
                {selectedSlot} - {(parseInt(selectedSlot.split(':')[0]) + 1).toString().padStart(2, '0')}:00
              </p>
            </div>
            <button 
              onClick={() => {
                setIsConfirming(true);
              }}
              className="h-[48px] px-8 rounded-full bg-secondary-container text-on-secondary-container font-semibold text-[14px] flex items-center justify-center shadow-[0_4px_12px_rgba(255,191,0,0.2)] hover:opacity-90 active:scale-95 transition-all cursor-pointer"
            >
              Confirm Selection
            </button>
          </div>
        </motion.div>
      )}

      {/* Booking Confirmation Modal */}
      <AnimatePresence>
        {isConfirming && selectedSlot && (
          <div className="fixed inset-0 z-[100] flex flex-col justify-end">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsConfirming(false)}
              className="absolute inset-0 bg-on-background/30 backdrop-blur-[2px]"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full bg-surface-container-lowest rounded-t-[24px] shadow-[0_-8px_20px_rgba(0,52,43,0.08)] flex flex-col pb-safe max-h-[90vh] overflow-y-auto"
            >
              {/* Drag Handle Indicator */}
              <div className="w-full flex justify-center pt-2 pb-2">
                <div className="w-12 h-1.5 bg-surface-variant rounded-full"></div>
              </div>

              {/* Sheet Header */}
              <div className="px-5 pb-2 flex items-center justify-between sticky top-0 bg-surface-container-lowest z-10">
                <h2 className="font-semibold text-[20px] text-on-surface">Confirm Booking</h2>
                <button 
                  onClick={() => setIsConfirming(false)}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container hover:bg-surface-variant transition-colors text-on-surface-variant cursor-pointer"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="px-5 flex flex-col gap-6 pb-5">
                {/* Venue Summary Card */}
                <div className="flex gap-4 bg-surface p-2 rounded-[16px] border border-outline-variant/30">
                  <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 bg-surface-variant relative">
                    <img src={venue.images[0]} alt={venue.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col justify-center">
                    <h3 className="font-semibold text-[14px] text-on-surface mb-1">{venue.name}</h3>
                    <p className="text-[14px] text-on-surface-variant mb-2">{court.name} • {court.surface}</p>
                    <div className="flex items-center gap-1 text-primary">
                      <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      <span className="font-medium text-[12px]">{venue.rating}</span>
                    </div>
                  </div>
                </div>

                {/* Booking Details Grid */}
                <div className="grid grid-cols-2 gap-4 bg-surface-container-low p-4 rounded-[16px]">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 text-primary">
                      <span className="material-symbols-outlined">calendar_today</span>
                    </div>
                    <div>
                      <p className="font-medium text-[12px] text-on-surface-variant uppercase tracking-wider mb-0.5">Date</p>
                      <p className="font-semibold text-[14px] text-on-surface">{new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 text-primary">
                      <span className="material-symbols-outlined">schedule</span>
                    </div>
                    <div>
                      <p className="font-medium text-[12px] text-on-surface-variant uppercase tracking-wider mb-0.5">Time</p>
                      <p className="font-semibold text-[14px] text-on-surface">{selectedSlot} - {(parseInt(selectedSlot.split(':')[0]) + 1).toString().padStart(2, '0')}:00</p>
                    </div>
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="flex flex-col gap-2 pt-2 border-t border-surface-variant">
                  <h4 className="font-semibold text-[14px] text-on-surface mb-2">Payment Summary</h4>
                  <div className="flex justify-between items-center">
                    <span className="text-[14px] text-on-surface-variant">Court Fee (1 hr)</span>
                    <span className="text-[14px] text-on-surface">₹{venue.price}.00</span>
                  </div>
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-surface-variant border-dashed">
                    <span className="font-semibold text-[20px] text-on-surface">Total</span>
                    <span className="font-semibold text-[20px] text-primary">₹{venue.price}.00</span>
                  </div>
                </div>

                {/* Action Button */}
                <button 
                  onClick={async () => {
                    try {
                      await Haptics.impact({ style: ImpactStyle.Heavy });
                    } catch (e) {
                      // ignore haptics error on web
                    }
                    
                    if (!currentUser) {
                      alert("You must be logged in to book.");
                      return;
                    }

                    try {
                      // Calculate end time (start time + 1 hour)
                      const startHour = parseInt(selectedSlot.split(':')[0]);
                      const endHour = (startHour + 1).toString().padStart(2, '0');
                      const endTime = `${endHour}:00`;

                      const bookingRef = doc(collection(db, 'bookings'));
                      await setDoc(bookingRef, {
                        id: bookingRef.id,
                        userId: currentUser.uid,
                        venueId: venue.id,
                        courtId: court.id,
                        date: selectedDate,
                        startTime: selectedSlot,
                        endTime,
                        status: 'confirmed',
                        createdAt: new Date().toISOString()
                      });

                      navigate(`/payment-success/${bookingRef.id}`);
                    } catch (err: any) {
                      console.error("Error creating booking:", err);
                      alert(`Booking failed: ${err.message}`);
                    }
                  }}
                  className="w-full h-[48px] bg-secondary-container text-primary rounded-full font-semibold text-[14px] flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all mt-2 shadow-sm cursor-pointer"
                >
                  <span className="material-symbols-outlined">lock</span>
                  Pay & Book
                </button>
                <p className="text-center font-medium text-[12px] text-on-surface-variant mt-2">
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
  title, 
  icon, 
  slots, 
  selectedSlot, 
  isSlotAvailable, 
  handleSlotClick 
}: { 
  title: string, 
  icon: string, 
  slots: string[], 
  selectedSlot: string | null, 
  isSlotAvailable: (t: string) => boolean, 
  handleSlotClick: (t: string) => void 
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
