import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { doc, getDoc, collection, query, where, onSnapshot, setDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useAndroidBackClose } from '../lib/backClose';
import { payWithRazorpay } from '../lib/razorpay';
import type { Venue, Court, Booking, UserProfile, PayerDetail } from '../types';
import Avatar from '../components/Avatar';

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
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedDate, setSelectedDate] = useState(() => toLocalIso(new Date()));
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  // Android back closes the confirmation sheet instead of leaving the page
  useAndroidBackClose(isConfirming, () => setIsConfirming(false));

  // Split payment state
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [groupSize, setGroupSize] = useState(2);
  const [splitMode, setSplitMode] = useState<'instant' | 'hold'>('hold');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
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
        console.error('Error fetching slot details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [venueId, courtId]);

  // Fetch friends list
  useEffect(() => {
    const fetchFriends = async () => {
      if (!currentUser) return;
      try {
        const snap = await getDocs(collection(db, 'friends', currentUser.uid, 'list'));
        const profiles = await Promise.all(
          snap.docs.map(async d => {
            const profileSnap = await getDoc(doc(db, 'users', d.id));
            return profileSnap.exists() ? ({ uid: profileSnap.id, ...profileSnap.data() } as UserProfile) : null;
          })
        );
        setFriends(profiles.filter(Boolean) as UserProfile[]);
      } catch (err) {
        console.error('Error fetching friends:', err);
      }
    };
    fetchFriends();
  }, [currentUser]);

  // Real-time listener for bookings
  useEffect(() => {
    if (!venueId || !courtId || !selectedDate) return;
    const bookingsQuery = query(
      collection(db, 'bookings'),
      where('venueId', '==', venueId),
      where('courtId', '==', courtId),
      where('date', '==', selectedDate),
      // Both confirmed AND held slots occupy the court — otherwise a held split
      // booking's slot wrongly shows as available and gets double-booked.
      where('status', 'in', ['confirmed', 'hold'])
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

  // Derived split values
  const totalPrice = venue?.price ?? 0;
  // Per-friend share uses floor; the booker absorbs the rounding remainder so the
  // group total always equals the court fee (Math.ceil used to overcharge).
  const friendShare = splitEnabled ? Math.floor(totalPrice / groupSize) : totalPrice;
  const bookerShare = splitEnabled ? totalPrice - friendShare * (groupSize - 1) : totalPrice;
  // "Instant" → booker pays the full court fee now, slot confirms immediately.
  // "Hold"    → booker pays only their share, slot is held until everyone pays.
  const bookerPays = splitEnabled && splitMode === 'instant' ? totalPrice : bookerShare;
  // Amount each invited friend is asked to pay via the split link.
  const sharePerPlayer = friendShare;

  // A split booking must invite exactly (groupSize − 1) friends to cover every share.
  const requiredFriends = groupSize - 1;
  const friendsValid = !splitEnabled || selectedFriends.length === requiredFriends;

  const toggleFriend = (uid: string) => {
    setSelectedFriends(prev => {
      if (prev.includes(uid)) return prev.filter(x => x !== uid);
      if (prev.length >= requiredFriends) return prev; // already invited enough
      return [...prev, uid];
    });
  };

  const adjustGroupSize = (delta: number) => {
    const next = Math.min(8, Math.max(2, groupSize + delta));
    setGroupSize(next);
    setSelectedFriends(prev => prev.slice(0, next - 1)); // trim invites if shrinking
  };

  const handleConfirmBooking = async () => {
    if (!currentUser || !venue || !court || !selectedSlot || isSubmitting) return;
    if (splitEnabled && selectedFriends.length !== requiredFriends) {
      alert(`Please invite exactly ${requiredFriends} friend(s) for a group of ${groupSize}.`);
      return;
    }
    // Re-check availability right before writing — the live listener includes
    // confirmed + held slots, so this catches a slot taken since selection.
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
      const token = crypto.randomUUID();

      // Fetch current user's display name and photo for payer details
      const userSnap = await getDoc(doc(db, 'users', currentUser.uid));
      const payerName = userSnap.exists()
        ? (userSnap.data().displayName as string) || currentUser.displayName || 'Player'
        : currentUser.displayName || 'Player';
      const payerPhoto = userSnap.exists()
        ? (userSnap.data().photoURL as string) || currentUser.photoURL || undefined
        : currentUser.photoURL || undefined;

      const firstPayerDetail: PayerDetail = {
        uid: currentUser.uid,
        name: payerName,
        amount: bookerPays,
        paidAt: new Date().toISOString(),
        photoURL: payerPhoto,
      };

      const bookingData: Omit<Booking, 'id'> = {
        userId: currentUser.uid,
        venueId: venue.id,
        courtId: court.id,
        date: selectedDate,
        startTime: selectedSlot,
        endTime,
        status: splitEnabled && splitMode === 'hold' ? 'hold' : 'confirmed',
        createdAt: new Date().toISOString(),
        ...(splitEnabled
          ? {
              splitPayment: {
                enabled: true,
                groupSize,
                mode: splitMode,
                sharePerPlayer,
                paidPlayers: [currentUser.uid],
                invitedFriends: selectedFriends,
                paymentLinkToken: token,
                payerDetails: [firstPayerDetail],
              },
            }
          : {}),
      };

      // Collect payment via Razorpay before the booking is written. If the user
      // cancels or payment fails, this throws and no booking is created.
      await payWithRazorpay({
        amountRupees: bookerPays,
        receipt: `book_${bookingRef.id}`.slice(0, 40),
        description: `${venue.name} — ${court.name}`,
        prefill: { name: payerName, email: currentUser.email ?? undefined },
      });

      await setDoc(bookingRef, { id: bookingRef.id, ...bookingData });
      navigate(`/payment-success/${bookingRef.id}`);
    } catch (err: unknown) {
      console.error('Error creating booking:', err);
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
          <button onClick={() => navigate(-1)} className="flex items-center justify-center hover:bg-surface-container-high transition-colors rounded-full p-1 cursor-pointer text-primary">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="font-bold text-[24px] text-primary">PlayHub</h1>
          <div className="flex items-center gap-2 text-on-surface-variant">
            <span className="material-symbols-outlined cursor-pointer hover:bg-surface-container-high transition-colors rounded-full p-1">notifications</span>
          </div>
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

            {/* Right Column: Time Slot Sections inside a Unified Card */}
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
                {selectedSlot} - {(parseInt(selectedSlot.split(':')[0]) + 1).toString().padStart(2, '0')}:00
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

      {/* Booking Confirmation Modal */}
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
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container hover:bg-surface-variant transition-colors text-on-surface-variant cursor-pointer"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="px-5 flex flex-col gap-5 pb-6">
                {/* Venue Summary Card */}
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
                        {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 text-primary"><span className="material-symbols-outlined">schedule</span></div>
                    <div>
                      <p className="font-medium text-[12px] text-on-surface-variant uppercase tracking-wider mb-0.5">Time</p>
                      <p className="font-semibold text-[14px] text-on-surface">
                        {selectedSlot} - {(parseInt(selectedSlot.split(':')[0]) + 1).toString().padStart(2, '0')}:00
                      </p>
                    </div>
                  </div>
                </div>

                {/* ── Split Payment Toggle ─────────────────────────────────── */}
                <div className="bg-surface-container-low rounded-[16px] overflow-hidden">
                  <button
                    onClick={() => setSplitEnabled(v => !v)}
                    className="w-full flex items-center justify-between px-4 py-3.5 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-secondary-container/30 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[18px] text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>call_split</span>
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[14px] text-on-surface">Split Payment</span>
                          <span className="bg-secondary-container text-on-secondary-container text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide">New</span>
                        </div>
                        <p className="text-[11px] text-on-surface-variant">Pay your share & send link to others</p>
                      </div>
                    </div>
                    {/* Toggle pill */}
                    <div className={`w-12 h-6 rounded-full transition-colors relative ${splitEnabled ? 'bg-primary' : 'bg-surface-variant'}`}>
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${splitEnabled ? 'left-7' : 'left-1'}`} />
                    </div>
                  </button>

                  <AnimatePresence>
                    {splitEnabled && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 flex flex-col gap-4 border-t border-outline-variant/30 pt-4">

                          {/* Group Size */}
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-[14px] text-on-surface">Group Size</p>
                              <p className="text-[11px] text-on-surface-variant">Total number of players</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => adjustGroupSize(-1)}
                                className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-primary font-bold text-[18px] cursor-pointer active:scale-90 transition-all"
                              >−</button>
                              <span className="font-bold text-[20px] text-on-surface w-6 text-center">{groupSize}</span>
                              <button
                                onClick={() => adjustGroupSize(1)}
                                className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-primary font-bold text-[18px] cursor-pointer active:scale-90 transition-all"
                              >+</button>
                            </div>
                          </div>

                          {/* Mode Selector */}
                          <div>
                            <p className="font-semibold text-[13px] text-on-surface mb-2">Payment Mode</p>
                            <div className="grid grid-cols-2 gap-3">
                              {(['instant', 'hold'] as const).map(mode => (
                                <button
                                  key={mode}
                                  onClick={() => setSplitMode(mode)}
                                  className={`p-3 rounded-[14px] text-left transition-all cursor-pointer border-2 ${
                                    splitMode === mode
                                      ? 'border-primary bg-primary/5'
                                      : 'border-outline-variant/40 bg-surface-container'
                                  }`}
                                >
                                  <div className={`w-7 h-7 rounded-full flex items-center justify-center mb-2 ${
                                    splitMode === mode ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant'
                                  }`}>
                                    <span className="material-symbols-outlined text-[15px]">
                                      {mode === 'instant' ? 'bolt' : 'pause_circle'}
                                    </span>
                                  </div>
                                  <p className="font-bold text-[13px] text-on-surface capitalize">{mode === 'instant' ? 'Instant' : 'Hold'}</p>
                                  <p className="text-[10px] text-on-surface-variant mt-0.5 leading-snug">
                                    {mode === 'instant'
                                      ? 'Pay full amount now. Booking confirmed instantly.'
                                      : 'Pay your share. Slot held for 24 hours.'}
                                  </p>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Invite Friends */}
                          {friends.length > 0 && (
                            <div>
                              <p className="font-semibold text-[13px] text-on-surface mb-2">Invite Friends</p>
                              <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1">
                                {friends.map(f => {
                                  const selected = selectedFriends.includes(f.uid);
                                  return (
                                    <button
                                      key={f.uid}
                                      onClick={() => toggleFriend(f.uid)}
                                      className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer"
                                    >
                                      <div className={`relative rounded-full transition-all ${selected ? 'ring-2 ring-primary ring-offset-2' : ''}`}>
                                        <Avatar name={f.displayName} photoURL={f.photoURL} size={48} />
                                        {selected && (
                                          <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                                            <span className="material-symbols-outlined text-[12px] text-on-primary font-bold">check</span>
                                          </div>
                                        )}
                                      </div>
                                      <span className="text-[10px] text-on-surface-variant font-medium max-w-[52px] truncate text-center">{f.displayName.split(' ')[0]}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* "How It Works" Accordion */}
                          <div className="bg-surface-container rounded-[14px] overflow-hidden">
                            <button
                              onClick={() => setHowItWorksOpen(v => !v)}
                              className="w-full flex items-center justify-between px-4 py-3 cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px] text-secondary">info</span>
                                <span className="font-semibold text-[13px] text-on-surface">How Reserve &amp; Split Payment Works?</span>
                              </div>
                              <span className={`material-symbols-outlined text-[18px] text-on-surface-variant transition-transform ${howItWorksOpen ? 'rotate-180' : ''}`}>expand_more</span>
                            </button>
                            <AnimatePresence>
                              {howItWorksOpen && (
                                <motion.div
                                  initial={{ height: 0 }}
                                  animate={{ height: 'auto' }}
                                  exit={{ height: 0 }}
                                  className="overflow-hidden"
                                >
                                  <div className="px-4 pb-4 flex flex-col gap-3">
                                    {[
                                      { step: 1, title: 'Select Slots & Activate Split Payment', body: 'Add continuous slots, switch on Split Payment, set group size, and choose "Instant Confirmation" or "Hold".' },
                                      { step: 2, title: 'Review', body: 'Review your selection and complete your share of the payment.' },
                                      { step: 3, title: 'Share Payment Link', body: 'Share the payment link to your friends so they can pay their share.' },
                                      { step: 4, title: 'Booking Confirmation', body: 'If on "Hold", pay the confirmation amount 24 hours before the playing time to confirm the slot.' },
                                      { step: 5, title: 'Booking Complete', body: 'All set! The remaining amounts are paid via the shared payment link.' },
                                    ].map(item => (
                                      <div key={item.step} className="flex gap-3">
                                        <div className="shrink-0 w-6 h-6 rounded-full bg-secondary-container text-on-secondary-container text-[11px] font-bold flex items-center justify-center mt-0.5">
                                          {item.step}
                                        </div>
                                        <div>
                                          <p className="font-semibold text-[12px] text-on-surface">{item.title}</p>
                                          <p className="text-[11px] text-on-surface-variant leading-snug mt-0.5">{item.body}</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Price Breakdown */}
                <div className="flex flex-col gap-2 pt-1 border-t border-surface-variant">
                  <h4 className="font-semibold text-[14px] text-on-surface mb-1">Payment Summary</h4>
                  <div className="flex justify-between items-center">
                    <span className="text-[14px] text-on-surface-variant">Court Fee (1 hr)</span>
                    <span className="text-[14px] text-on-surface">₹{totalPrice}.00</span>
                  </div>
                  {splitEnabled && (
                    <div className="flex justify-between items-center text-on-surface-variant">
                      <span className="text-[13px]">÷ {groupSize} players</span>
                      <span className="text-[13px]">= ₹{sharePerPlayer} each</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-surface-variant border-dashed">
                    <span className="font-semibold text-[18px] text-on-surface">
                      {!splitEnabled ? 'Total' : splitMode === 'instant' ? 'You Pay (Full)' : 'Your Share'}
                    </span>
                    <span className="font-bold text-[20px] text-primary">₹{bookerPays}.00</span>
                  </div>
                  {splitEnabled && splitMode === 'instant' && (
                    <p className="text-[11px] text-on-surface-variant">
                      You pay the full ₹{totalPrice} now; friends reimburse ₹{sharePerPlayer} each via the link.
                    </p>
                  )}
                  {splitEnabled && splitMode === 'hold' && (
                    <p className="text-[11px] text-on-surface-variant bg-surface-container-low rounded-xl px-3 py-2 mt-1">
                      ⏸ Slot will be held for 24 hours. Pay your full share to confirm permanently.
                    </p>
                  )}
                </div>

                {/* Invite validation hint */}
                {splitEnabled && !friendsValid && (
                  <p className="text-[12px] text-error bg-error/5 rounded-xl px-3 py-2 text-center">
                    Invite exactly {requiredFriends} friend{requiredFriends === 1 ? '' : 's'} for a group of {groupSize} ({selectedFriends.length} selected).
                  </p>
                )}

                {/* Action Button */}
                <button
                  onClick={handleConfirmBooking}
                  disabled={isSubmitting || !friendsValid}
                  className={`w-full h-[52px] bg-secondary-container text-primary rounded-full font-semibold text-[15px] flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm cursor-pointer ${isSubmitting || !friendsValid ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-90'}`}
                >
                  {isSubmitting
                    ? <span className="material-symbols-outlined animate-spin">sync</span>
                    : <span className="material-symbols-outlined">{splitEnabled ? 'call_split' : 'lock'}</span>}
                  {isSubmitting
                    ? 'Processing…'
                    : splitEnabled
                      ? splitMode === 'hold' ? `Pay ₹${bookerPays} & Hold Slot` : `Pay ₹${bookerPays} & Confirm`
                      : 'Pay & Book'}
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
