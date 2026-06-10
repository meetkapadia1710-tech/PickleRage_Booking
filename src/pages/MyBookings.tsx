import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import type { Booking, Venue, Court } from '../types';
import AppHeader from '../components/AppHeader';
import { getWalletPassUrl } from '../lib/wallet';
import googleWalletBadge from '../assets/add-to-google-wallet-badge.svg';

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, damping: 24, stiffness: 280 } },
};

export default function MyBookings() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    Promise.all([
      getDocs(collection(db, 'venues')),
      getDocs(collection(db, 'courts')),
      getDocs(query(collection(db, 'bookings'), where('userId', '==', currentUser.uid))),
    ])
      .then(([venuesSnap, courtsSnap, bookingsSnap]) => {
        if (cancelled) return;
        setVenues(venuesSnap.docs.map(d => ({ ...(d.data() as Venue), id: d.id })));
        setCourts(courtsSnap.docs.map(d => ({ ...(d.data() as Court), id: d.id })));
        setBookings(bookingsSnap.docs.map(d => ({ ...(d.data() as Booking), id: d.id })));
        setLoading(false);
      })
      .catch(err => {
        if (cancelled) return;
        console.error('Error fetching bookings:', err);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [currentUser, reloadKey]);

  const handleCancelBooking = async (bookingId: string) => {
    try {
      await updateDoc(doc(db, 'bookings', bookingId), { status: 'cancelled' });
      setReloadKey(k => k + 1);
    } catch {
      alert('Failed to cancel booking. Please try again.');
    }
  };

  const { upcomingBookings, pastBookings } = useMemo(() => {
    const now = new Date().getTime();
    const upcoming: Booking[] = [];
    const past: Booking[] = [];
    bookings.forEach(b => {
      const t = new Date(`${b.date}T${b.startTime}`).getTime();
      if (t >= now && b.status !== 'cancelled') upcoming.push(b);
      else past.push(b);
    });
    upcoming.sort((a, b) => new Date(`${a.date}T${a.startTime}`).getTime() - new Date(`${b.date}T${b.startTime}`).getTime());
    past.sort((a, b) => new Date(`${b.date}T${b.startTime}`).getTime() - new Date(`${a.date}T${a.startTime}`).getTime());
    return { upcomingBookings: upcoming, pastBookings: past };
  }, [bookings]);

  const tabs = [
    { key: 'upcoming' as const, label: 'Upcoming' },
    { key: 'past' as const, label: 'Past' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.14 }}
      className="bg-background text-on-background min-h-screen pb-28 flex flex-col"
    >
      <AppHeader />

      <main className="px-5 max-w-3xl mx-auto mt-6 w-full">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', damping: 24, stiffness: 280 }}
          className="mb-6"
        >
          <h1 className="font-bold text-[28px] text-primary mb-1">Bookings</h1>
          <p className="text-[14px] text-on-surface-variant">Manage your court reservations.</p>
        </motion.div>

        {/* Framer-motion tab switcher */}
        <div className="flex w-full mb-6 bg-surface-container-lowest p-1 rounded-xl shadow-[0_4px_12px_rgba(0,52,43,0.04)] relative">
          {tabs.map(tab => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="flex-1 relative z-10 h-[48px] flex items-center justify-center font-semibold text-[14px] cursor-pointer outline-none"
              >
                {active && (
                  <motion.div
                    layoutId="bookings-tab-pill"
                    transition={{ type: 'spring', damping: 28, stiffness: 350 }}
                    className="absolute inset-0 bg-primary rounded-lg"
                  />
                )}
                <span className={`relative z-10 transition-colors duration-150 ${active ? 'text-on-primary' : 'text-on-surface-variant'}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {loading ? (
          <div className="space-y-4">
            <BookingCardSkeleton />
            <BookingCardSkeleton />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: activeTab === 'upcoming' ? -16 : 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: activeTab === 'upcoming' ? 16 : -16 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            >
              {activeTab === 'upcoming' ? (
                upcomingBookings.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-surface-container-lowest rounded-[20px] p-8 text-center text-on-surface-variant font-medium border border-dashed border-outline-variant/30"
                  >
                    No upcoming bookings. Book a court now!
                  </motion.div>
                ) : (
                  <motion.div variants={listVariants} initial="hidden" animate="visible" className="space-y-4">
                    {upcomingBookings.map(booking => {
                      const venue = venues.find(v => v.id === booking.venueId);
                      const court = courts.find(c => c.id === booking.courtId);
                      return (
                        <motion.div key={booking.id} variants={itemVariants}>
                          <BookingCard booking={booking} venue={venue} court={court} onCancel={() => handleCancelBooking(booking.id)} />
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )
              ) : (
                pastBookings.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-surface-container-lowest rounded-[20px] p-8 text-center text-on-surface-variant font-medium border border-dashed border-outline-variant/30"
                  >
                    No past bookings found.
                  </motion.div>
                ) : (
                  <motion.div variants={listVariants} initial="hidden" animate="visible" className="space-y-4">
                    {pastBookings.map(booking => {
                      const venue = venues.find(v => v.id === booking.venueId);
                      const court = courts.find(c => c.id === booking.courtId);
                      return (
                        <motion.div key={booking.id} variants={itemVariants}>
                          <PastBookingCard booking={booking} venue={venue} court={court} />
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </main>
    </motion.div>
  );
}

function BookingCard({ booking, venue, court, onCancel }: {
  booking: Booking; venue: Venue | undefined; court: Court | undefined; onCancel: () => void;
}) {
  const isConfirmed = booking.status === 'confirmed';
  const isHold = booking.status === 'hold';
  const isSplit = !!booking.splitPayment?.enabled;

  const formattedDate = useMemo(() => {
    const d = new Date(`${booking.date}T00:00:00`);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const dateStr = d.getTime() === today.getTime() ? 'Today'
      : d.getTime() === tomorrow.getTime() ? 'Tomorrow'
      : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const [hour, min] = booking.startTime.split(':');
    const h = parseInt(hour);
    return `${dateStr}, ${h % 12 || 12}:${min} ${h >= 12 ? 'PM' : 'AM'}`;
  }, [booking.date, booking.startTime]);

  const [walletUrl, setWalletUrl] = useState<string>('');

  useEffect(() => {
    const fetchWalletUrl = async () => {
      if (venue && court) {
        const url = await getWalletPassUrl(booking, venue, court);
        setWalletUrl(url);
      }
    };
    fetchWalletUrl();
  }, [booking, venue, court]);

  const [linkCopied, setLinkCopied] = useState(false);

  return (
    <div className="bg-surface-container-lowest rounded-[20px] p-4 shadow-[0_4px_16px_rgba(0,52,43,0.15)] border border-outline-variant/65 hover:border-primary/60 transition-colors">
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md mb-2 ${isConfirmed ? 'bg-secondary-container/20 text-on-secondary-container' : 'bg-surface-container text-on-surface-variant'}`}>
            <span className="material-symbols-outlined text-[14px]">event</span>
            <span className="font-medium text-[12px]">{formattedDate}</span>
          </div>
          <h3 className="font-semibold text-[20px] text-primary">{venue?.name || booking.venueId}</h3>
          <p className="text-[14px] text-on-surface-variant">{court?.name || booking.courtId} • {court?.surface || 'Standard surface'}</p>
        </div>
        <div className={`px-3 py-1 rounded-full font-medium text-[12px] capitalize shrink-0 ${
          isConfirmed ? 'bg-secondary text-on-secondary'
          : isHold ? 'bg-amber-100 text-amber-700'
          : 'bg-surface-container text-on-surface-variant'
        }`}>
          {isHold ? '⏸ On Hold' : booking.status}
        </div>
      </div>
      {(isConfirmed || isHold) && (
        <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-surface-container-high">
          {/* Split payment info */}
          {isSplit && booking.splitPayment && (
            <div className="flex items-center justify-between bg-surface-container-low rounded-xl px-3 py-2">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-secondary">call_split</span>
                <span className="text-[12px] font-semibold text-on-surface">
                  {booking.splitPayment.paidPlayers.length}/{booking.splitPayment.groupSize} players paid
                </span>
              </div>
              <button
                onClick={async () => {
                  const url = `${window.location.origin}/split/${booking.splitPayment!.paymentLinkToken}`;
                  await navigator.clipboard.writeText(url);
                  setLinkCopied(true);
                  setTimeout(() => setLinkCopied(false), 2000);
                }}
                className="flex items-center gap-1 text-[11px] font-semibold text-primary cursor-pointer active:scale-95"
              >
                <span className="material-symbols-outlined text-[13px]">{linkCopied ? 'check' : 'content_copy'}</span>
                {linkCopied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          )}
          <div className="flex gap-2">
          {isConfirmed && walletUrl && (
            <a href={walletUrl} target="_blank" rel="noopener noreferrer" className="flex-1 flex justify-center items-center h-[48px]">
              <img src={googleWalletBadge} alt="Save to Google Wallet" className="h-[48px] object-contain" />
            </a>
          )}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onCancel}
            className="flex-1 h-[48px] text-error font-semibold text-[14px] border-[1.5px] border-error/20 rounded-full hover:bg-error/5 hover:border-error/50 transition-colors cursor-pointer"
          >
            Cancel Booking
          </motion.button>
          </div>
        </div>
      )}
    </div>
  );
}

function PastBookingCard({ booking, venue, court }: {
  booking: Booking; venue: Venue | undefined; court: Court | undefined;
}) {
  const formattedDate = useMemo(() => {
    const d = new Date(`${booking.date}T00:00:00`);
    const [hour, min] = booking.startTime.split(':');
    const h = parseInt(hour);
    return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${h % 12 || 12}:${min} ${h >= 12 ? 'PM' : 'AM'}`;
  }, [booking.date, booking.startTime]);

  const isCancelled = booking.status === 'cancelled';

  return (
    <div className="bg-surface-container-lowest rounded-[20px] p-4 shadow-[0_4px_16px_rgba(0,52,43,0.15)] border border-outline-variant/65 opacity-80">
      <div className="flex justify-between items-start">
        <div>
          <div className="inline-flex items-center gap-1 text-on-surface-variant mb-2">
            <span className="material-symbols-outlined text-[14px]">history</span>
            <span className="font-medium text-[12px]">{formattedDate}</span>
          </div>
          <h3 className="font-semibold text-[20px] text-primary">{venue?.name || booking.venueId}</h3>
          <p className="text-[14px] text-on-surface-variant">{court?.name || booking.courtId} • {court?.surface || 'Standard surface'}</p>
        </div>
        <div className={`px-3 py-1 rounded-full font-medium text-[12px] capitalize shrink-0 ${isCancelled ? 'bg-error/10 text-error' : 'bg-surface-variant text-on-surface-variant'}`}>
          {isCancelled ? 'Cancelled' : 'Completed'}
        </div>
      </div>
    </div>
  );
}

function BookingCardSkeleton() {
  return (
    <div className="bg-surface-container-lowest rounded-[20px] p-4 border border-outline-variant/65 shadow-[0_4px_16px_rgba(0,52,43,0.15)] animate-pulse">
      <div className="flex justify-between items-start mb-4">
        <div className="w-full">
          <div className="h-5 w-32 bg-surface-container-high rounded mb-3" />
          <div className="h-6 w-3/4 bg-surface-container-high rounded mb-2" />
          <div className="h-4 w-1/2 bg-surface-container-high rounded" />
        </div>
        <div className="h-5 w-16 bg-surface-container-high rounded-full shrink-0" />
      </div>
      <div className="flex gap-2 mt-4 pt-4 border-t border-surface-container-high">
        <div className="flex-1 h-[48px] bg-surface-container-high rounded-full" />
      </div>
    </div>
  );
}
