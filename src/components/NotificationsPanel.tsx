import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useAndroidBackClose } from '../lib/backClose';
import { formatDate, formatTime } from '../lib/format';
import { logger } from '../lib/logger';

interface BookingNotif {
  id: string;
  title: string;
  body: string;
}

const PROMOS = [
  {
    id: 'promo-1',
    icon: 'local_activity',
    title: '20% off weekday mornings',
    body: 'Book any court before 10 AM, Mon–Fri, and save.',
  },
  {
    id: 'promo-2',
    icon: 'sports_cricket',
    title: 'New Box Cricket arena',
    body: 'PlayHub Box Cricket Arena is now open in North Hub.',
  },
];

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};
const itemVariants = {
  hidden: { opacity: 0, x: -16 },
  visible: { opacity: 1, x: 0, transition: { type: 'spring', damping: 24, stiffness: 300 } },
} as const;

export default function NotificationsPanel({
  open,
  onClose,
  onHasNotifications,
}: {
  open: boolean;
  onClose: () => void;
  /** Called once data is loaded — parent uses this to show/hide the unread dot. */
  onHasNotifications?: (has: boolean) => void;
}) {
  useAndroidBackClose(open, onClose);
  const { currentUser } = useAuth();
  const [bookingNotifs, setBookingNotifs] = useState<BookingNotif[]>([]);

  useEffect(() => {
    if (!currentUser) return;

    const fetchUpcoming = async () => {
      try {
        // Fetch the user's confirmed bookings
        const snap = await getDocs(
          query(
            collection(db, 'bookings'),
            where('userId', '==', currentUser.uid),
            where('status', '==', 'confirmed'),
          )
        );

        const now = new Date();
        const upcoming = snap.docs
          .map(d => d.data())
          .filter(b => new Date(`${b['date']}T${b['endTime']}:00`) > now)
          .sort((a, b) =>
            new Date(`${a['date']}T${a['startTime']}`).getTime() -
            new Date(`${b['date']}T${b['startTime']}`).getTime()
          )
          .slice(0, 3);

        if (upcoming.length === 0) {
          onHasNotifications?.(false);
          setBookingNotifs([]);
          return;
        }

        // Fetch venue names for each booking in parallel
        const notifs: BookingNotif[] = await Promise.all(
          upcoming.map(async b => {
            let venueName = 'Your court';
            try {
              const venueSnap = await getDoc(doc(db, 'venues', b['venueId'] as string));
              if (venueSnap.exists()) {
                const name = venueSnap.data()['name'] as string;
                venueName = name.split(',')[0];
              }
            } catch { /* ignore — fall back to generic text */ }

            return {
              id: b['id'] as string,
              title: 'Upcoming booking',
              body: `${venueName} • ${formatDate(b['date'] as string)}, ${formatTime(b['startTime'] as string)}`,
            };
          })
        );

        setBookingNotifs(notifs);
        onHasNotifications?.(notifs.length > 0);
      } catch (err) {
        logger.warn('NotificationsPanel: could not fetch bookings', err);
        onHasNotifications?.(false);
      }
    };

    fetchUpcoming();
  // Run once when the current user is known (or changes).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.uid]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[110] px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ y: -150, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -150, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 240 }}
            className="relative mt-[calc(1rem+env(safe-area-inset-top))] w-full max-w-md mx-auto bg-[#002019]/90 backdrop-blur-[18px] border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.35)] rounded-3xl pb-4 overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Notifications"
          >
            <div className="flex justify-between items-center px-5 pt-4 pb-2 border-b border-white/5">
              <h2 className="font-bold text-[18px] text-white">Notifications</h2>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                aria-label="Close notifications"
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 border border-white/10 text-white/80 hover:bg-white/20 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </motion.button>
            </div>

            <motion.ul
              variants={listVariants}
              initial="hidden"
              animate="visible"
              className="px-3 pt-2 flex flex-col gap-1 max-h-[60vh] overflow-y-auto hide-scrollbar"
            >
              {/* Upcoming booking notifications */}
              {bookingNotifs.map(n => (
                <motion.li
                  key={n.id}
                  variants={itemVariants}
                  className="flex items-start gap-3 p-3 rounded-2xl hover:bg-white/5 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-secondary-container/20 text-secondary-container border border-secondary-container/10">
                    <span className="material-symbols-outlined text-[20px]">event_available</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[14px] text-white leading-tight">{n.title}</p>
                    <p className="text-[13px] text-white/70 mt-1 leading-snug">{n.body}</p>
                  </div>
                </motion.li>
              ))}

              {/* Static promo items */}
              {PROMOS.map(n => (
                <motion.li
                  key={n.id}
                  variants={itemVariants}
                  className="flex items-start gap-3 p-3 rounded-2xl hover:bg-white/5 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-white/5 text-white/80 border border-white/5">
                    <span className="material-symbols-outlined text-[20px]">{n.icon}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[14px] text-white leading-tight">{n.title}</p>
                    <p className="text-[13px] text-white/70 mt-1 leading-snug">{n.body}</p>
                  </div>
                </motion.li>
              ))}
            </motion.ul>

            <div className="w-full flex justify-center pt-3 border-t border-white/5 mt-2">
              <div className="w-12 h-1.5 bg-white/20 rounded-full" />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
