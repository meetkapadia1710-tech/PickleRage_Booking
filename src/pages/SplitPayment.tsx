import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  collection, query, where, getDocs, doc, getDoc, updateDoc, arrayUnion,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import type { Booking, Venue, Court } from '../types';
import { formatDate, formatTime } from '../lib/format';

export default function SplitPayment() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [court, setCourt] = useState<Court | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      if (!token) { setError('Invalid link.'); setLoading(false); return; }
      try {
        const q = query(
          collection(db, 'bookings'),
          where('splitPayment.paymentLinkToken', '==', token)
        );
        const snap = await getDocs(q);
        if (snap.empty) { setError('Booking not found.'); setLoading(false); return; }

        const bookingDoc = snap.docs[0];
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
    fetch();
  }, [token]);

  const alreadyPaid = booking?.splitPayment?.paidPlayers?.includes(currentUser?.uid ?? '') ?? false;
  const paidCount = booking?.splitPayment?.paidPlayers?.length ?? 0;
  const groupSize = booking?.splitPayment?.groupSize ?? 1;
  const allPaid = paidCount >= groupSize;
  const shareAmount = booking?.splitPayment?.sharePerPlayer ?? 0;

  const handlePay = async () => {
    if (!currentUser || !booking) return;
    setPaying(true);
    try {
      const newPaid = [...(booking.splitPayment?.paidPlayers ?? []), currentUser.uid];
      const allNowPaid = newPaid.length >= groupSize;

      await updateDoc(doc(db, 'bookings', booking.id), {
        'splitPayment.paidPlayers': arrayUnion(currentUser.uid),
        ...(allNowPaid ? { status: 'confirmed' } : {}),
      });

      setBooking(prev => prev ? {
        ...prev,
        status: allNowPaid ? 'confirmed' : prev.status,
        splitPayment: prev.splitPayment ? {
          ...prev.splitPayment,
          paidPlayers: newPaid,
        } : prev.splitPayment,
      } : prev);

      setDone(true);
    } catch (err) {
      console.error(err);
      alert('Payment failed. Please try again.');
    } finally {
      setPaying(false);
    }
  };

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
      className="min-h-screen bg-background pb-20"
    >
      {/* Header */}
      <div className="bg-primary/90 backdrop-blur-md pt-[calc(1.5rem+env(safe-area-inset-top))] pb-6 px-5 text-on-primary flex items-center gap-3">
        <button onClick={() => navigate('/home')} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center cursor-pointer">
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </button>
        <div>
          <p className="text-[12px] opacity-70 font-medium">Split Payment</p>
          <h1 className="font-bold text-[20px]">{venue.name.split(' ').slice(0, 2).join(' ')}</h1>
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
        <div className="bg-surface-container-lowest rounded-[20px] border border-outline-variant/40 shadow-sm p-4">
          <div className="flex justify-between items-center mb-3">
            <p className="font-semibold text-[15px] text-on-surface">Players Paid</p>
            <p className="font-bold text-[15px] text-primary">{paidCount} / {groupSize}</p>
          </div>
          <div className="h-2 bg-surface-container-low rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(paidCount / groupSize) * 100}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="h-full bg-primary rounded-full"
            />
          </div>
          <div className="flex gap-2 mt-3 flex-wrap">
            {Array.from({ length: groupSize }).map((_, i) => {
              const paid = i < paidCount;
              return (
                <div key={i} className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium ${
                  paid ? 'bg-primary/10 text-primary' : 'bg-surface-container-low text-on-surface-variant'
                }`}>
                  <span className="material-symbols-outlined text-[13px]">{paid ? 'check_circle' : 'radio_button_unchecked'}</span>
                  Player {i + 1}
                </div>
              );
            })}
          </div>
        </div>

        {/* Pay action */}
        <div className="bg-surface-container-lowest rounded-[20px] border border-outline-variant/40 shadow-sm p-5 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <p className="text-[14px] text-on-surface-variant">Your share</p>
            <p className="font-bold text-[28px] text-primary">₹{shareAmount}</p>
          </div>

          {allPaid ? (
            <div className="bg-primary/10 rounded-xl p-3 flex items-center gap-2 text-primary">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              <span className="font-semibold text-[13px]">All players paid — booking is confirmed!</span>
            </div>
          ) : alreadyPaid || done ? (
            <div className="bg-primary/10 rounded-xl p-3 flex items-center gap-2 text-primary">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              <span className="font-semibold text-[13px]">You've already paid your share ✓</span>
            </div>
          ) : (
            <motion.button
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

          <p className="text-center text-[11px] text-on-surface-variant">
            By paying you agree to the venue's booking & cancellation policy.
          </p>
        </div>

        <button
          onClick={() => navigate('/home')}
          className="text-primary text-[14px] font-semibold text-center py-2 cursor-pointer hover:underline"
        >
          Return to Home
        </button>
      </main>
    </motion.div>
  );
}
