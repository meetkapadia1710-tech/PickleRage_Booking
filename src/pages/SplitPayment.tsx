import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  collection, query, where, getDocs, doc, getDoc, updateDoc, arrayUnion, onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import type { Booking, Venue, Court, PayerDetail } from '../types';
import { formatDate, formatTime } from '../lib/format';
import Avatar from '../components/Avatar';

export default function SplitPayment() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [bookingId, setBookingId] = useState<string | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [court, setCourt] = useState<Court | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Initial fetch by token ──────────────────────────────────────────────────
  useEffect(() => {
    const fetchByToken = async () => {
      if (!token) { setError('Invalid link.'); setLoading(false); return; }
      try {
        const q = query(
          collection(db, 'bookings'),
          where('splitPayment.paymentLinkToken', '==', token)
        );
        const snap = await getDocs(q);
        if (snap.empty) { setError('Booking not found.'); setLoading(false); return; }

        const bookingDoc = snap.docs[0];
        setBookingId(bookingDoc.id);

        const bookingData = { id: bookingDoc.id, ...bookingDoc.data() } as Booking;
        setBooking(bookingData);

        const [venueSnap, courtSnap] = await Promise.all([
          getDoc(doc(db, 'venues', bookingData.venueId)),
          getDoc(doc(db, 'courts', bookingData.courtId)),
        ]);
        if (venueSnap.exists()) setVenue({ ...(venueSnap.data() as Venue), id: venueSnap.id });
        if (courtSnap.exists()) setCourt({ ...(courtSnap.data() as Court), id: courtSnap.id });
      } catch (err) {
        console.error(err);
        setError('Could not load booking details.');
      } finally {
        setLoading(false);
      }
    };
    fetchByToken();
  }, [token]);

  // ── Real-time listener for live payer updates ───────────────────────────────
  useEffect(() => {
    if (!bookingId) return;
    return onSnapshot(doc(db, 'bookings', bookingId), snap => {
      if (snap.exists()) {
        setBooking({ id: snap.id, ...snap.data() } as Booking);
      }
    });
  }, [bookingId]);

  const alreadyPaid = booking?.splitPayment?.paidPlayers?.includes(currentUser?.uid ?? '') ?? false;
  const paidCount   = booking?.splitPayment?.paidPlayers?.length ?? 0;
  const groupSize   = booking?.splitPayment?.groupSize ?? 1;
  const allPaid     = paidCount >= groupSize;
  const shareAmount = booking?.splitPayment?.sharePerPlayer ?? 0;
  const payerDetails: PayerDetail[] = booking?.splitPayment?.payerDetails ?? [];

  // ── Pay handler ─────────────────────────────────────────────────────────────
  const handlePay = async () => {
    if (!currentUser || !booking) return;
    setPaying(true);
    try {
      const newPaid = [...(booking.splitPayment?.paidPlayers ?? []), currentUser.uid];
      const allNowPaid = newPaid.length >= groupSize;

      // Fetch payer's display name and photo from Firestore users collection
      const userSnap = await getDoc(doc(db, 'users', currentUser.uid));
      const payerName = userSnap.exists()
        ? (userSnap.data().displayName as string) || currentUser.displayName || 'Player'
        : currentUser.displayName || 'Player';
      const payerPhoto = userSnap.exists()
        ? (userSnap.data().photoURL as string) || currentUser.photoURL || undefined
        : currentUser.photoURL || undefined;

      const newPayerDetail: PayerDetail = {
        uid: currentUser.uid,
        name: payerName,
        amount: shareAmount,
        paidAt: new Date().toISOString(),
        photoURL: payerPhoto,
      };

      await updateDoc(doc(db, 'bookings', booking.id), {
        'splitPayment.paidPlayers': arrayUnion(currentUser.uid),
        'splitPayment.payerDetails': arrayUnion(newPayerDetail),
        ...(allNowPaid ? { status: 'confirmed' } : {}),
      });

      setDone(true);
    } catch (err) {
      console.error(err);
      alert('Payment failed. Please try again.');
    } finally {
      setPaying(false);
    }
  };

  // ── Loading / error states ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-[48px] text-primary">sync</span>
      </div>
    );
  }

  if (error || !booking || !venue) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <span className="material-symbols-outlined text-[64px] text-error mb-4">link_off</span>
        <h1 className="text-2xl font-bold text-on-background mb-2">Link Not Valid</h1>
        <p className="text-on-surface-variant mb-6">{error ?? 'This split payment link is invalid or expired.'}</p>
        <button onClick={() => navigate('/home')} className="bg-primary text-on-primary px-6 py-2.5 rounded-full font-semibold cursor-pointer">Go Home</button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen bg-background pb-24"
    >
      {/* Header */}
      <div className="bg-primary/90 backdrop-blur-md pt-[calc(1.5rem+env(safe-area-inset-top))] pb-6 px-5 text-on-primary flex items-center gap-3">
        <button onClick={() => navigate('/bookings')} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center cursor-pointer">
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </button>
        <div>
          <p className="text-[12px] opacity-70 font-medium">Split Payment</p>
          <h1 className="font-bold text-[20px]">{venue.name.split(',')[0]}</h1>
        </div>
      </div>

      <main className="max-w-md mx-auto px-5 pt-6 flex flex-col gap-5">

        {/* Booking Card */}
        <div className="bg-surface-container-lowest rounded-[20px] border border-outline-variant/40 shadow-sm overflow-hidden">
          {venue.images?.[0] && (
            <div className="relative h-32">
              <img src={venue.images[0]} alt={venue.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-3 left-4">
                <p className="text-white font-bold text-[16px]">{venue.name}</p>
                {court && <p className="text-white/80 text-[12px]">{court.name} • {court.surface}</p>}
              </div>
            </div>
          )}
          <div className="p-4 grid grid-cols-2 gap-3">
            <div className="bg-surface-container-low rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-wider text-on-surface-variant font-medium mb-1">Date</p>
              <p className="font-semibold text-[13px] text-on-surface">{formatDate(booking.date)}</p>
            </div>
            <div className="bg-surface-container-low rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-wider text-on-surface-variant font-medium mb-1">Time</p>
              <p className="font-semibold text-[13px] text-on-surface">{formatTime(booking.startTime)}</p>
            </div>
          </div>
        </div>

        {/* Players Progress */}
        <div className="bg-surface-container-lowest rounded-[20px] border border-outline-variant/40 shadow-sm p-4 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <p className="font-semibold text-[15px] text-on-surface">Payment Status</p>
            <span className={`text-[12px] font-bold px-3 py-1 rounded-full ${
              allPaid ? 'bg-primary/10 text-primary' : 'bg-amber-100 text-amber-700'
            }`}>
              {allPaid ? 'All Confirmed ✓' : `${paidCount}/${groupSize} Paid`}
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-surface-container-low rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(paidCount / groupSize) * 100}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="h-full bg-primary rounded-full"
            />
          </div>

          {/* Payer list — who paid + how much */}
          <div className="flex flex-col gap-2">
            {/* Paid players with details */}
            {payerDetails.map((payer, i) => (
              <motion.div
                key={payer.uid}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 bg-primary/5 rounded-xl px-3 py-2.5"
              >
                <Avatar name={payer.name} photoURL={payer.photoURL} size={36} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[13px] text-on-surface truncate">
                    {payer.name}
                    {payer.uid === currentUser?.uid && (
                      <span className="ml-1.5 text-[10px] text-primary font-bold bg-primary/10 px-1.5 py-0.5 rounded-full">You</span>
                    )}
                  </p>
                  <p className="text-[10px] text-on-surface-variant">
                    {new Date(payer.paidAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-bold text-[14px] text-primary">₹{payer.amount}</span>
                  <span className="material-symbols-outlined text-[16px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                </div>
              </motion.div>
            ))}

            {/* Unpaid slots */}
            {Array.from({ length: groupSize - paidCount }).map((_, i) => (
              <div key={`pending-${i}`} className="flex items-center gap-3 bg-surface-container-low rounded-xl px-3 py-2.5 opacity-50">
                <div className="w-9 h-9 rounded-full bg-surface-container border border-dashed border-outline-variant flex items-center justify-center">
                  <span className="material-symbols-outlined text-[16px] text-on-surface-variant">person</span>
                </div>
                <p className="flex-1 text-[13px] text-on-surface-variant font-medium">Awaiting payment…</p>
                <span className="font-semibold text-[13px] text-on-surface-variant">₹{shareAmount}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pay Action */}
        <div className="bg-surface-container-lowest rounded-[20px] border border-outline-variant/40 shadow-sm p-5 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[12px] text-on-surface-variant font-medium mb-0.5">Your share</p>
              <p className="font-bold text-[32px] text-primary leading-none">₹{shareAmount}</p>
            </div>
            <div className="w-14 h-14 rounded-full bg-secondary-container/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-[28px] text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
                call_split
              </span>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {allPaid ? (
              <motion.div key="all-paid" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="bg-primary/10 rounded-xl p-3 flex items-center gap-2 text-primary">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                <span className="font-semibold text-[13px]">All players paid — booking is confirmed!</span>
              </motion.div>
            ) : alreadyPaid || done ? (
              <motion.div key="you-paid" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex flex-col gap-3">
                <div className="bg-primary/10 rounded-xl p-3 flex items-center gap-2 text-primary">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  <span className="font-semibold text-[13px]">You've paid your share ✓</span>
                </div>
                <button
                  onClick={() => navigate('/bookings')}
                  className="w-full h-[48px] bg-secondary-container text-on-secondary-container rounded-full font-semibold text-[14px] flex items-center justify-center gap-2 cursor-pointer hover:opacity-90 transition-opacity"
                >
                  <span className="material-symbols-outlined text-[18px]">event_available</span>
                  View in My Bookings
                </button>
              </motion.div>
            ) : (
              <motion.button
                key="pay-btn"
                whileTap={{ scale: 0.97 }}
                onClick={handlePay}
                disabled={paying}
                className="w-full h-[52px] bg-secondary-container text-on-secondary-container font-bold text-[16px] rounded-full flex items-center justify-center gap-2 cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {paying
                  ? <span className="material-symbols-outlined animate-spin">sync</span>
                  : <>
                      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>payments</span>
                      Pay ₹{shareAmount}
                    </>
                }
              </motion.button>
            )}
          </AnimatePresence>

          <p className="text-center text-[11px] text-on-surface-variant">
            By paying you agree to the venue's booking &amp; cancellation policy.
          </p>
        </div>

        <button
          onClick={() => navigate('/bookings')}
          className="text-primary text-[14px] font-semibold text-center py-2 cursor-pointer hover:underline"
        >
          View My Bookings
        </button>
      </main>
    </motion.div>
  );
}
