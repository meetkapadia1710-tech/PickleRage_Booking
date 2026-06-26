import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  collection, query, where, onSnapshot, updateDoc, doc,
  getDocs,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import type { Booking, Venue, Court } from '../types';
import AppHeader from '../components/AppHeader';
import { getWalletPassUrl } from '../lib/wallet';
import googleWalletBadge from '../assets/add-to-google-wallet-badge.svg';
import { sanitizeVenue } from '../lib/venues';
import { logger } from '../lib/logger';

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
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── Static data (venues & courts — doesn't change often) ──────────────────
  useEffect(() => {
    Promise.all([
      getDocs(collection(db, 'venues')),
      getDocs(collection(db, 'courts')),
    ]).then(([vSnap, cSnap]) => {
      setVenues(vSnap.docs.map(d => sanitizeVenue({ ...(d.data() as Venue), id: d.id })));
      let courtsList = cSnap.docs.map(d => ({ ...(d.data() as Court), id: d.id }));
      courtsList = [
        ...courtsList,
        { id: 'venue_2_c1', venueId: 'venue_2', name: 'Court 1', surface: 'Outdoor', isIndoor: false, squadSize: 'Full Court', sport: 'Pickleball' },
        { id: 'venue_2_c2', venueId: 'venue_2', name: 'Court 2', surface: 'Outdoor', isIndoor: false, squadSize: 'Full Court', sport: 'Pickleball' },
      ];
      setCourts(courtsList);
    }).catch(err => logger.error('MyBookings: error fetching venues', err));
  }, []);

  // ── Real-time listener: own bookings ──────────────────────────────────────
  useEffect(() => {
    if (!currentUser) return;

    const ownQ = query(collection(db, 'bookings'), where('userId', '==', currentUser.uid));
    const unsub = onSnapshot(
      ownQ,
      snap => {
        const result: Booking[] = [];
        snap.forEach(d => result.push({ ...(d.data() as Booking), id: d.id }));
        setBookings(result);
        setLoading(false);
      },
      err => {
        logger.warn('MyBookings: listener error', err);
        setLoading(false);
      }
    );

    return unsub;
  }, [currentUser]);

  const handleCancelBooking = async (bookingId: string) => {
    try {
      await updateDoc(doc(db, 'bookings', bookingId), { status: 'cancelled' });
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

  // Auto-expand/select first booking on desktop only
  useEffect(() => {
    if (window.innerWidth >= 1024) {
      const list = activeTab === 'upcoming' ? upcomingBookings : pastBookings;
      if (list.length > 0 && !expandedId) {
        setExpandedId(list[0].id);
      }
    }
  }, [bookings, activeTab, upcomingBookings, pastBookings, expandedId]);

  const handleTabChange = (tab: 'upcoming' | 'past') => {
    setActiveTab(tab);
    if (window.innerWidth >= 1024) {
      const list = tab === 'upcoming' ? upcomingBookings : pastBookings;
      if (list.length > 0) {
        setExpandedId(list[0].id);
      } else {
        setExpandedId(null);
      }
    } else {
      setExpandedId(null);
    }
  };

  const selectedBooking = useMemo(() => {
    return bookings.find(b => b.id === expandedId);
  }, [bookings, expandedId]);

  const selectedVenue = useMemo(() => {
    return venues.find(v => v.id === selectedBooking?.venueId);
  }, [venues, selectedBooking]);

  const selectedCourt = useMemo(() => {
    return courts.find(c => c.id === selectedBooking?.courtId);
  }, [courts, selectedBooking]);

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

      <main className="px-5 max-w-3xl md:max-w-5xl lg:max-w-6xl xl:max-w-7xl mx-auto mt-6 w-full animate-fadeIn">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', damping: 24, stiffness: 280 }}
          className="mb-6"
        >
          <h1 className="font-bold text-[28px] text-primary mb-1">Bookings</h1>
          <p className="text-[14px] text-on-surface-variant">Manage your court reservations.</p>
        </motion.div>

        {/* Tab switcher */}
        <div className="flex w-full mb-6 bg-surface-container-lowest p-1 rounded-xl shadow-[0_4px_12px_rgba(0,52,43,0.04)] relative">
          {tabs.map(tab => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
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

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
            <BookingCardSkeleton /><BookingCardSkeleton />
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
            {/* Master List (Left Pane) */}
            <div className="w-full lg:w-[380px] shrink-0 flex flex-col gap-4">
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
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-surface-container-lowest rounded-[20px] p-8 text-center text-on-surface-variant font-medium border border-dashed border-outline-variant/30"
                      >
                        No upcoming bookings. Book a court now!
                      </motion.div>
                    ) : (
                      <motion.div variants={listVariants} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
                        {upcomingBookings.map(booking => {
                          const venue = venues.find(v => v.id === booking.venueId);
                          const court = courts.find(c => c.id === booking.courtId);
                          return (
                            <motion.div key={booking.id} variants={itemVariants}>
                              <BookingCard
                                booking={booking} venue={venue} court={court}
                                isExpanded={expandedId === booking.id}
                                onToggle={() => {
                                  if (window.innerWidth >= 1024) {
                                    setExpandedId(booking.id);
                                  } else {
                                    setExpandedId(expandedId === booking.id ? null : booking.id);
                                  }
                                }}
                                onCancel={() => handleCancelBooking(booking.id)}
                                isOwner={currentUser?.uid === booking.userId}
                                hideDetailsOnDesktop={true}
                              />
                            </motion.div>
                          );
                        })}
                      </motion.div>
                    )
                  ) : (
                    pastBookings.length === 0 ? (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-surface-container-lowest rounded-[20px] p-8 text-center text-on-surface-variant font-medium border border-dashed border-outline-variant/30"
                      >
                        No past bookings found.
                      </motion.div>
                    ) : (
                      <motion.div variants={listVariants} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
                        {pastBookings.map(booking => {
                          const venue = venues.find(v => v.id === booking.venueId);
                          const court = courts.find(c => c.id === booking.courtId);
                          return (
                            <motion.div key={booking.id} variants={itemVariants}>
                              <BookingCard
                                booking={booking} venue={venue} court={court}
                                isExpanded={expandedId === booking.id}
                                onToggle={() => {
                                  if (window.innerWidth >= 1024) {
                                    setExpandedId(booking.id);
                                  } else {
                                    setExpandedId(expandedId === booking.id ? null : booking.id);
                                  }
                                }}
                                onCancel={() => handleCancelBooking(booking.id)}
                                isOwner={currentUser?.uid === booking.userId}
                                hideDetailsOnDesktop={true}
                              />
                            </motion.div>
                          );
                        })}
                      </motion.div>
                    )
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Sticky Detail Panel (Right Pane) */}
            <div className="hidden lg:block flex-1 sticky top-24 self-start">
              {selectedBooking ? (
                <BookingDetailPanel
                  booking={selectedBooking}
                  venue={selectedVenue}
                  court={selectedCourt}
                  onCancel={() => handleCancelBooking(selectedBooking.id)}
                  isOwner={currentUser?.uid === selectedBooking.userId}
                />
              ) : (
                <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/65 p-8 text-center text-on-surface-variant font-medium min-h-[300px] flex flex-col items-center justify-center gap-3">
                  <span className="material-symbols-outlined text-[40px] text-primary">event_available</span>
                  <p className="font-semibold text-on-surface">Select a Reservation</p>
                  <p className="text-[12px] text-on-surface-variant">Click a booking from the list to view its complete receipt.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </motion.div>
  );
}

// ─── BookingCard ──────────────────────────────────────────────────────────────
function BookingCard({
  booking, venue, court, isExpanded, onToggle, onCancel, isOwner, hideDetailsOnDesktop = false,
}: {
  booking: Booking; venue: Venue | undefined; court: Court | undefined;
  isExpanded: boolean; onToggle: () => void; onCancel: () => void; isOwner: boolean;
  hideDetailsOnDesktop?: boolean;
}) {
  const isConfirmed = booking.status === 'confirmed';
  const isCancelled = booking.status === 'cancelled';

  const formattedDate = useMemo(() => {
    const d = new Date(`${booking.date}T00:00:00`);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const dateStr = d.getTime() === today.getTime() ? 'Today'
      : d.getTime() === tomorrow.getTime() ? 'Tomorrow'
      : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const [hour, min] = booking.startTime.split(':');
    const h = parseInt(hour);
    return `${dateStr} · ${h % 12 || 12}:${min} ${h >= 12 ? 'PM' : 'AM'}`;
  }, [booking.date, booking.startTime]);

  const [walletUrl, setWalletUrl] = useState('');
  const [isGeneratingWallet, setIsGeneratingWallet] = useState(false);

  useEffect(() => {
    if (venue && court && isConfirmed) {
      getWalletPassUrl(booking, venue, court).then(setWalletUrl).catch(() => {});
    }
  }, [booking, venue, court, isConfirmed]);

  const handleAddToWallet = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (walletUrl) {
      window.open(walletUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    if (!venue || !court) {
      alert('Cannot generate pass: Court details are still loading. Please try again in a moment.');
      return;
    }
    setIsGeneratingWallet(true);
    try {
      const url = await getWalletPassUrl(booking, venue, court);
      if (url) {
        setWalletUrl(url);
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        alert('Failed to generate Google Wallet pass. Please try again.');
      }
    } catch (err) {
      logger.error('MyBookings: wallet pass generation error', err);
      alert('Failed to generate Google Wallet pass. Please try again.');
    } finally {
      setIsGeneratingWallet(false);
    }
  };

  const chip = isCancelled
    ? { label: 'Cancelled', cls: 'bg-error/10 text-error' }
    : isConfirmed
      ? { label: 'Confirmed', cls: 'bg-secondary text-on-secondary' }
      : { label: booking.status, cls: 'bg-surface-container text-on-surface-variant' };

  return (
    <div className={`bg-surface-container-lowest rounded-[20px] shadow-[0_4px_16px_rgba(0,52,43,0.06)] border transition-all duration-200 overflow-hidden ${
      isExpanded ? 'border-primary lg:bg-primary/5' : 'border-outline-variant/65 hover:border-primary/30'
    }`}>

      {/* ── Tap header ── */}
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-start gap-3 text-left cursor-pointer"
      >
        <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-surface-variant shadow-sm">
          {venue?.images?.[0]
            ? <img src={venue.images[0]} alt="" className="w-full h-full object-cover" />
            : <span className="material-symbols-outlined text-[28px] text-on-surface-variant flex items-center justify-center h-full">sports_tennis</span>
          }
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${chip.cls}`}>
              {chip.label}
            </span>
          </div>
          <h3 className="font-semibold text-[15px] text-on-surface truncate">
            {venue?.name?.split(',')[0] || booking.venueId}
          </h3>
          <p className="text-[12px] text-on-surface-variant truncate">
            {court?.name || ''} · {formattedDate}
          </p>
        </div>

        <span className={`material-symbols-outlined text-on-surface-variant text-[20px] mt-1 transition-transform duration-200 shrink-0 ${isExpanded ? 'rotate-180' : ''} ${hideDetailsOnDesktop ? 'lg:hidden' : ''}`}>
          expand_more
        </span>

        {hideDetailsOnDesktop && (
          <span className={`hidden lg:inline-block material-symbols-outlined text-primary text-[20px] mt-1 transition-all duration-200 shrink-0 ${isExpanded ? 'translate-x-1 opacity-100' : 'opacity-0'}`}>
            chevron_right
          </span>
        )}
      </button>

      {/* ── Expanded details ── */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className={`overflow-hidden ${hideDetailsOnDesktop ? 'lg:hidden' : ''}`}
          >
            <div className="px-4 pb-4 flex flex-col gap-4 border-t border-outline-variant/20 pt-4">

              {/* Booking details grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: 'calendar_today', label: 'Date',
                    value: new Date(`${booking.date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) },
                  { icon: 'schedule', label: 'Time',
                    value: (() => { const [h,m] = booking.startTime.split(':'); const hr = parseInt(h); return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`; })() },
                  { icon: 'location_on', label: 'Court', value: court?.name || '—' },
                  { icon: 'layers', label: 'Surface', value: court?.surface || '—' },
                ].map(item => (
                  <div key={item.label} className="bg-surface-container-low rounded-xl p-3">
                    <div className="flex items-center gap-1 mb-1">
                      <span className="material-symbols-outlined text-[13px] text-on-surface-variant">{item.icon}</span>
                      <span className="text-[10px] uppercase tracking-wider text-on-surface-variant font-medium">{item.label}</span>
                    </div>
                    <p className="font-semibold text-[13px] text-on-surface truncate">{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Actions */}
              {!isCancelled && (isConfirmed || isOwner) && (
                <div className="flex gap-2">
                  {isConfirmed && (
                    <button
                      onClick={handleAddToWallet}
                      disabled={isGeneratingWallet}
                      className="flex-1 flex justify-center items-center h-[48px] bg-[#000000] rounded-full border-none cursor-pointer hover:opacity-90 transition-opacity"
                    >
                      {isGeneratingWallet ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <img src={googleWalletBadge} alt="Save to Google Wallet" className="h-[48px] object-contain" />
                      )}
                    </button>
                  )}
                  {isOwner && (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={onCancel}
                      className="flex-1 h-[48px] text-error font-semibold text-[14px] border-[1.5px] border-error/20 rounded-full hover:bg-error/5 hover:border-error/50 transition-colors cursor-pointer"
                    >
                      Cancel Booking
                    </motion.button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── BookingDetailPanel ────────────────────────────────────────────────────────
function BookingDetailPanel({
  booking, venue, court, onCancel, isOwner,
}: {
  booking: Booking; venue: Venue | undefined; court: Court | undefined;
  onCancel: () => void; isOwner: boolean;
}) {
  const isConfirmed = booking.status === 'confirmed';
  const isCancelled = booking.status === 'cancelled';

  const [walletUrl, setWalletUrl] = useState('');
  const [isGeneratingWallet, setIsGeneratingWallet] = useState(false);

  useEffect(() => {
    if (venue && court && isConfirmed) {
      getWalletPassUrl(booking, venue, court).then(setWalletUrl).catch(() => {});
    }
  }, [booking, venue, court, isConfirmed]);

  const handleAddToWallet = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (walletUrl) {
      window.open(walletUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    if (!venue || !court) {
      alert('Cannot generate pass: Court details are still loading. Please try again in a moment.');
      return;
    }
    setIsGeneratingWallet(true);
    try {
      const url = await getWalletPassUrl(booking, venue, court);
      if (url) {
        setWalletUrl(url);
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        alert('Failed to generate Google Wallet pass. Please try again.');
      }
    } catch (err) {
      logger.error('MyBookings: wallet pass generation error', err);
      alert('Failed to generate Google Wallet pass. Please try again.');
    } finally {
      setIsGeneratingWallet(false);
    }
  };

  const chip = isCancelled
    ? { label: 'Cancelled', cls: 'bg-error/10 text-error' }
    : isConfirmed
      ? { label: 'Confirmed', cls: 'bg-secondary text-on-secondary' }
      : { label: booking.status, cls: 'bg-surface-container text-on-surface-variant' };

  return (
    <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/65 p-6 shadow-[0_8px_30px_rgba(0,52,43,0.06)] flex flex-col gap-5">
      {/* Detail Header */}
      <div className="flex gap-4 items-start">
        <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 bg-surface-variant shadow-sm">
          {venue?.images?.[0]
            ? <img src={venue.images[0]} alt="" className="w-full h-full object-cover" />
            : <span className="material-symbols-outlined text-[36px] text-on-surface-variant flex items-center justify-center h-full">sports_tennis</span>
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex gap-2 items-center mb-1.5">
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${chip.cls}`}>
              {chip.label}
            </span>
          </div>
          <h2 className="font-extrabold text-[20px] text-on-surface leading-tight truncate mb-1">
            {venue?.name || booking.venueId}
          </h2>
          <p className="text-[13px] text-on-surface-variant flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">location_on</span>
            {venue?.address || 'Court address unavailable'}
          </p>
        </div>
      </div>

      <hr className="border-outline-variant/20" />

      {/* Grid info */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: 'calendar_today', label: 'Date',
            value: new Date(`${booking.date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }) },
          { icon: 'schedule', label: 'Time',
            value: (() => { const [h,m] = booking.startTime.split(':'); const hr = parseInt(h); return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`; })() },
          { icon: 'location_on', label: 'Court', value: court?.name || '—' },
          { icon: 'layers', label: 'Surface', value: court?.surface || '—' },
        ].map(item => (
          <div key={item.label} className="bg-surface-container-low/70 rounded-2xl p-4 border border-outline-variant/30">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="material-symbols-outlined text-[15px] text-primary">{item.icon}</span>
              <span className="text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">{item.label}</span>
            </div>
            <p className="font-bold text-[14px] text-on-surface truncate">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      {!isCancelled && (isConfirmed || isOwner) && (
        <div className="flex gap-3 mt-4">
          {isConfirmed && (
            <button
              onClick={handleAddToWallet}
              disabled={isGeneratingWallet}
              className="flex-1 flex justify-center items-center h-[48px] bg-[#000000] rounded-xl border-none cursor-pointer hover:opacity-90 transition-opacity"
            >
              {isGeneratingWallet ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <img src={googleWalletBadge} alt="Save to Google Wallet" className="h-[36px] object-contain" />
              )}
            </button>
          )}
          {isOwner && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onCancel}
              className="flex-1 h-[48px] text-error font-bold text-[14px] border-[1.5px] border-error/20 rounded-xl hover:bg-error/5 hover:border-error/50 transition-colors cursor-pointer"
            >
              Cancel Booking
            </motion.button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function BookingCardSkeleton() {
  return (
    <div className="bg-surface-container-lowest rounded-[20px] p-4 border border-outline-variant/65 animate-pulse flex items-center gap-3">
      <div className="w-14 h-14 rounded-xl bg-surface-container-high shrink-0" />
      <div className="flex-1">
        <div className="h-4 w-20 bg-surface-container-high rounded-full mb-2" />
        <div className="h-5 w-3/4 bg-surface-container-high rounded mb-2" />
        <div className="h-3 w-1/2 bg-surface-container-high rounded" />
      </div>
    </div>
  );
}
