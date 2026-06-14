import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  collection, query, where, onSnapshot, updateDoc, doc,
  getDocs,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import type { Booking, Venue, Court, PayerDetail } from '../types';
import AppHeader from '../components/AppHeader';
import Avatar from '../components/Avatar';
import { getWalletPassUrl } from '../lib/wallet';
import { splitPaymentUrl } from '../lib/appUrl';
import googleWalletBadge from '../assets/add-to-google-wallet-badge.svg';
import { sanitizeVenue } from '../lib/venues';

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
    }).catch(console.error);
  }, []);

  // ── Real-time listener: own bookings + teammate split bookings ─────────────
  useEffect(() => {
    if (!currentUser) return;

    const bookingMap = new Map<string, Booking>();
    let ownReady = false;
    let splitReady = false;
    let invitedReady = false;

    const flush = () => {
      if (ownReady && splitReady && invitedReady) {
        setBookings([...bookingMap.values()]);
        setLoading(false);
      }
    };

    // Own bookings
    const ownQ = query(collection(db, 'bookings'), where('userId', '==', currentUser.uid));
    const unsubOwn = onSnapshot(
      ownQ,
      snap => {
        snap.docs.forEach(d => bookingMap.set(d.id, { ...(d.data() as Booking), id: d.id }));
        // Remove own bookings that were deleted
        snap.docChanges().forEach(change => {
          if (change.type === 'removed') bookingMap.delete(change.doc.id);
        });
        ownReady = true;
        flush();
      },
      err => {
        console.warn('MyBookings ownQ error:', err);
        ownReady = true;
        flush();
      }
    );

    // Teammate split bookings (where user is in paidPlayers)
    const splitQ = query(
      collection(db, 'bookings'),
      where('splitPayment.paidPlayers', 'array-contains', currentUser.uid)
    );
    const unsubSplit = onSnapshot(splitQ, snap => {
      snap.docs.forEach(d => {
        if (!bookingMap.has(d.id)) {  // don't overwrite own booking
          bookingMap.set(d.id, { ...(d.data() as Booking), id: d.id });
        } else {
          // Update existing entry with latest data
          bookingMap.set(d.id, { ...(d.data() as Booking), id: d.id });
        }
      });
      snap.docChanges().forEach(change => {
        if (change.type === 'removed') bookingMap.delete(change.doc.id);
      });
      splitReady = true;
      flush();
    }, () => {
      // If array-contains query fails (missing index), just mark ready
      splitReady = true;
      flush();
    });

    // Invited (but not-yet-paid) split bookings. A friend added at booking time
    // is stored in splitPayment.invitedFriends but not yet in paidPlayers, so
    // this surfaces the booking for them ("waiting for confirmation") until they
    // pay their share — at which point the paidPlayers listener above takes over.
    const invitedQ = query(
      collection(db, 'bookings'),
      where('splitPayment.invitedFriends', 'array-contains', currentUser.uid)
    );
    const unsubInvited = onSnapshot(invitedQ, snap => {
      snap.docs.forEach(d => bookingMap.set(d.id, { ...(d.data() as Booking), id: d.id }));
      snap.docChanges().forEach(change => {
        if (change.type === 'removed') bookingMap.delete(change.doc.id);
      });
      invitedReady = true;
      flush();
    }, () => {
      invitedReady = true;
      flush();
    });

    return () => { unsubOwn(); unsubSplit(); unsubInvited(); };
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
      setExpandedId(null); // Keep collapsed on mobile when switching tabs
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
                                currentUid={currentUser?.uid ?? ''}
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
                                currentUid={currentUser?.uid ?? ''}
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
                  currentUid={currentUser?.uid ?? ''}
                />
              ) : (
                <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/65 p-8 text-center text-on-surface-variant font-medium min-h-[300px] flex flex-col items-center justify-center gap-3">
                  <span className="material-symbols-outlined text-[40px] text-primary">event_available</span>
                  <p className="font-semibold text-on-surface">Select a Reservation</p>
                  <p className="text-[12px] text-on-surface-variant">Click a booking from the list to view its complete receipt and teammate split payments details.</p>
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
  booking, venue, court, isExpanded, onToggle, onCancel, currentUid, hideDetailsOnDesktop = false,
}: {
  booking: Booking; venue: Venue | undefined; court: Court | undefined;
  isExpanded: boolean; onToggle: () => void; onCancel: () => void; currentUid: string;
  hideDetailsOnDesktop?: boolean;
}) {
  const isConfirmed = booking.status === 'confirmed';
  const isHold      = booking.status === 'hold';
  const isCancelled = booking.status === 'cancelled';
  const isSplit     = !!booking.splitPayment?.enabled;

  const paidCount  = booking.splitPayment?.paidPlayers?.length ?? 0;
  const groupSize  = booking.splitPayment?.groupSize ?? 1;
  const allPaid    = paidCount >= groupSize;
  const payerDetails: PayerDetail[] = booking.splitPayment?.payerDetails ?? [];

  const navigate   = useNavigate();
  const isOwner    = booking.userId === currentUid;
  const hasPaid    = (booking.splitPayment?.paidPlayers ?? []).includes(currentUid);
  // An invited teammate who still owes their share can pay straight from the card.
  const canPayShare = isSplit && !isOwner && !hasPaid && !isCancelled && !allPaid;

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

  const [walletUrl, setWalletUrl]   = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    if (venue && court && isConfirmed) {
      getWalletPassUrl(booking, venue, court).then(setWalletUrl).catch(() => {});
    }
  }, [booking, venue, court, isConfirmed]);

  const statusChip = () => {
    if (isCancelled) return { label: 'Cancelled', cls: 'bg-error/10 text-error' };
    if (allPaid && isSplit) return { label: 'Confirmed ✓', cls: 'bg-primary/10 text-primary' };
    if (isHold)  return { label: '⏸ On Hold', cls: 'bg-amber-100 text-amber-700' };
    if (isConfirmed) return { label: 'Confirmed', cls: 'bg-secondary text-on-secondary' };
    return { label: booking.status, cls: 'bg-surface-container text-on-surface-variant' };
  };

  const chip = statusChip();

  return (
    <div className={`bg-surface-container-lowest rounded-[20px] shadow-[0_4px_16px_rgba(0,52,43,0.06)] border transition-all duration-200 overflow-hidden ${
      isExpanded ? 'border-primary lg:bg-primary/5' : 'border-outline-variant/65 hover:border-primary/30'
    }`}>

      {/* ── Tap header ── */}
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-start gap-3 text-left cursor-pointer"
      >
        {/* Venue image thumbnail */}
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
            {isSplit && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-semibold text-secondary bg-secondary/10 px-2 py-0.5 rounded-full flex items-center gap-0.5 shrink-0">
                  <span className="material-symbols-outlined text-[11px]">call_split</span>
                  {paidCount}/{groupSize} paid
                </span>
              </div>
            )}
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

              {/* Split payment payer list */}
              {isSplit && booking.splitPayment && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-[13px] text-on-surface">Payment Status</p>
                    <div className="h-1.5 flex-1 mx-3 bg-surface-container-low rounded-full overflow-hidden">
                      <motion.div
                        animate={{ width: `${(paidCount / groupSize) * 100}%` }}
                        className="h-full bg-primary rounded-full"
                        transition={{ duration: 0.4 }}
                      />
                    </div>
                    <span className="text-[12px] font-bold text-primary">{paidCount}/{groupSize}</span>
                  </div>

                  {/* Paid players */}
                  {payerDetails.map(payer => (
                    <div key={payer.uid} className="flex items-center gap-3 bg-primary/5 rounded-xl px-3 py-2.5">
                      <Avatar name={payer.name} photoURL={payer.photoURL} size={34} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[13px] text-on-surface truncate">
                          {payer.name}
                          {payer.uid === currentUid && (
                            <span className="ml-1.5 text-[10px] text-primary font-bold bg-primary/10 px-1.5 py-0.5 rounded-full">You</span>
                          )}
                        </p>
                        <p className="text-[10px] text-on-surface-variant">
                          {new Date(payer.paidAt).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-[14px] text-primary">₹{payer.amount}</span>
                        <span className="material-symbols-outlined text-[15px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      </div>
                    </div>
                  ))}

                  {/* Unpaid slots */}
                  {Array.from({ length: Math.max(0, groupSize - paidCount) }).map((_, i) => (
                    <div key={`pending-${i}`} className="flex items-center gap-3 bg-surface-container-low rounded-xl px-3 py-2.5 opacity-60">
                      <div className="w-[34px] h-[34px] rounded-full border-2 border-dashed border-outline-variant flex items-center justify-center">
                        <span className="material-symbols-outlined text-[15px] text-on-surface-variant">person</span>
                      </div>
                      <p className="flex-1 text-[12px] text-on-surface-variant">Awaiting payment…</p>
                      <span className="text-[13px] font-semibold text-on-surface-variant">₹{booking.splitPayment?.sharePerPlayer}</span>
                    </div>
                  ))}

                  {/* Copy link */}
                  <button
                    onClick={async () => {
                      const url = splitPaymentUrl(booking.splitPayment!.paymentLinkToken);
                      await navigator.clipboard.writeText(url);
                      setLinkCopied(true);
                      setTimeout(() => setLinkCopied(false), 2000);
                    }}
                    className="flex items-center justify-center gap-2 h-[40px] bg-surface-container border border-outline-variant/40 rounded-full text-[12px] font-semibold text-on-surface cursor-pointer hover:bg-surface-container-high transition-colors"
                  >
                    <span className="material-symbols-outlined text-[15px]">{linkCopied ? 'check' : 'content_copy'}</span>
                    {linkCopied ? 'Link Copied!' : 'Copy Share Link'}
                  </button>
                </div>
              )}

              {/* Actions */}
              {!isCancelled && (canPayShare || isOwner || (isConfirmed && walletUrl)) && (
                <div className="flex gap-2">
                  {canPayShare && (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => navigate(`/split/${booking.splitPayment!.paymentLinkToken}`, { state: { booking, venue, court } })}
                      className="flex-1 h-[48px] bg-secondary-container text-on-secondary-container font-semibold text-[14px] rounded-full flex items-center justify-center gap-1.5 hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>payments</span>
                      Pay your share ₹{booking.splitPayment?.sharePerPlayer}
                    </motion.button>
                  )}
                  {isConfirmed && walletUrl && (
                    <a href={walletUrl} target="_blank" rel="noopener noreferrer" className="flex-1 flex justify-center items-center h-[48px]">
                      <img src={googleWalletBadge} alt="Save to Google Wallet" className="h-[48px] object-contain" />
                    </a>
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
  booking, venue, court, onCancel, currentUid,
}: {
  booking: Booking; venue: Venue | undefined; court: Court | undefined;
  onCancel: () => void; currentUid: string;
}) {
  const isConfirmed = booking.status === 'confirmed';
  const isHold      = booking.status === 'hold';
  const isCancelled = booking.status === 'cancelled';
  const isSplit     = !!booking.splitPayment?.enabled;

  const paidCount  = booking.splitPayment?.paidPlayers?.length ?? 0;
  const groupSize  = booking.splitPayment?.groupSize ?? 1;
  const allPaid    = paidCount >= groupSize;
  const payerDetails: PayerDetail[] = booking.splitPayment?.payerDetails ?? [];

  const navigate   = useNavigate();
  const isOwner    = booking.userId === currentUid;
  const hasPaid    = (booking.splitPayment?.paidPlayers ?? []).includes(currentUid);
  // An invited teammate who still owes their share can pay straight from the panel.
  const canPayShare = isSplit && !isOwner && !hasPaid && !isCancelled && !allPaid;

  const [walletUrl, setWalletUrl]   = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    if (venue && court && isConfirmed) {
      getWalletPassUrl(booking, venue, court).then(setWalletUrl).catch(() => {});
    }
  }, [booking, venue, court, isConfirmed]);

  const statusChip = () => {
    if (isCancelled) return { label: 'Cancelled', cls: 'bg-error/10 text-error' };
    if (allPaid && isSplit) return { label: 'Confirmed ✓', cls: 'bg-primary/10 text-primary' };
    if (isHold)  return { label: '⏸ On Hold', cls: 'bg-amber-100 text-amber-700' };
    if (isConfirmed) return { label: 'Confirmed', cls: 'bg-secondary text-on-secondary' };
    return { label: booking.status, cls: 'bg-surface-container text-on-surface-variant' };
  };

  const chip = statusChip();

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
            {isSplit && (
              <span className="text-[10px] font-semibold text-secondary bg-secondary/10 px-2 py-0.5 rounded-full flex items-center gap-0.5 shrink-0">
                <span className="material-symbols-outlined text-[11px]">call_split</span>
                Split payment
              </span>
            )}
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

      {/* Split details */}
      {isSplit && booking.splitPayment && (
        <div className="flex flex-col gap-3 bg-surface-container-low/30 border border-outline-variant/40 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-extrabold text-[14px] text-on-surface">Split Payment Status</p>
              <p className="text-[11px] text-on-surface-variant">Each player pays ₹{booking.splitPayment.sharePerPlayer}</p>
            </div>
            <span className="text-[14px] font-extrabold text-primary bg-primary/10 px-3 py-1 rounded-full">{paidCount}/{groupSize} paid</span>
          </div>

          <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
            <motion.div
              animate={{ width: `${(paidCount / groupSize) * 100}%` }}
              className="h-full bg-gradient-to-r from-primary to-[#004d40] rounded-full"
              transition={{ duration: 0.4 }}
            />
          </div>

          <div className="flex flex-col gap-2 mt-2">
            {/* Paid players */}
            {payerDetails.map(payer => (
              <div key={payer.uid} className="flex items-center gap-3 bg-surface-container-lowest rounded-xl px-3 py-2 border border-outline-variant/20 shadow-sm">
                <Avatar name={payer.name} photoURL={payer.photoURL} size={30} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[13px] text-on-surface truncate">
                    {payer.name}
                    {payer.uid === currentUid && (
                      <span className="ml-1.5 text-[10px] text-primary font-bold bg-primary/10 px-1.5 py-0.5 rounded-full">You</span>
                    )}
                  </p>
                  <p className="text-[10px] text-on-surface-variant">
                    {new Date(payer.paidAt).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-extrabold text-[13px] text-primary">₹{payer.amount}</span>
                  <span className="material-symbols-outlined text-[15px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                </div>
              </div>
            ))}

            {/* Unpaid slots */}
            {Array.from({ length: Math.max(0, groupSize - paidCount) }).map((_, i) => (
              <div key={`pending-${i}`} className="flex items-center gap-3 bg-surface-container-lowest/50 rounded-xl px-3 py-2 border border-dashed border-outline-variant/30 opacity-60">
                <div className="w-[30px] h-[30px] rounded-full border-2 border-dashed border-outline-variant flex items-center justify-center">
                  <span className="material-symbols-outlined text-[14px] text-on-surface-variant">person</span>
                </div>
                <p className="flex-1 text-[12px] text-on-surface-variant">Awaiting payment…</p>
                <span className="text-[13px] font-semibold text-on-surface-variant">₹{booking.splitPayment?.sharePerPlayer}</span>
              </div>
            ))}
          </div>

          <button
            onClick={async () => {
              const url = splitPaymentUrl(booking.splitPayment!.paymentLinkToken);
              await navigator.clipboard.writeText(url);
              setLinkCopied(true);
              setTimeout(() => setLinkCopied(false), 2000);
            }}
            className="flex items-center justify-center gap-2 h-[42px] mt-2 bg-surface-container border border-outline-variant/40 rounded-full text-[13px] font-bold text-on-surface cursor-pointer hover:bg-surface-container-high transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">{linkCopied ? 'check' : 'content_copy'}</span>
            {linkCopied ? 'Link Copied!' : 'Copy Share Link'}
          </button>
        </div>
      )}

      {/* Actions */}
      {!isCancelled && (canPayShare || isOwner || (isConfirmed && walletUrl)) && (
        <div className="flex gap-3 mt-4">
          {canPayShare && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(`/split/${booking.splitPayment!.paymentLinkToken}`)}
              className="flex-1 h-[48px] bg-secondary-container text-on-secondary-container font-bold text-[14px] rounded-xl flex items-center justify-center gap-1.5 hover:opacity-90 active:scale-95 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>payments</span>
              Pay your share ₹{booking.splitPayment?.sharePerPlayer}
            </motion.button>
          )}
          {isConfirmed && walletUrl && (
            <a href={walletUrl} target="_blank" rel="noopener noreferrer" className="flex-1 flex justify-center items-center h-[48px] bg-[#000000] rounded-xl hover:opacity-90 transition-opacity">
              <img src={googleWalletBadge} alt="Save to Google Wallet" className="h-[36px] object-contain" />
            </a>
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

