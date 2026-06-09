import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getUserBookings } from '../lib/store';
import { mockVenues } from '../data/mockVenues';
import { formatDate, formatTime } from '../lib/format';

interface Notification {
  id: string;
  icon: string;
  title: string;
  body: string;
  accent?: boolean;
}

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, x: -16 },
  visible: { opacity: 1, x: 0, transition: { type: 'spring', damping: 24, stiffness: 300 } },
} as const;

export default function NotificationsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const notifications = useMemo<Notification[]>(() => {
    const now = new Date();
    const bookingNotifs: Notification[] = getUserBookings()
      .filter(b => b.status === 'confirmed' && new Date(`${b.date}T${b.endTime}:00`) > now)
      .slice(-3)
      .reverse()
      .map(b => {
        const venue = mockVenues.find(v => v.id === b.venueId);
        return {
          id: b.id,
          icon: 'event_available',
          title: 'Booking confirmed',
          body: `${venue?.name ?? 'Your court'} • ${formatDate(b.date)}, ${formatTime(b.startTime)}`,
          accent: true,
        };
      });

    return [
      ...bookingNotifs,
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
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[110]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-on-background/30 backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ y: '-100%' }}
            animate={{ y: 0 }}
            exit={{ y: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="relative w-full bg-surface-container-lowest rounded-b-[28px] shadow-[0_8px_32px_rgba(0,52,43,0.15)] pb-4"
            style={{ paddingTop: 'env(safe-area-inset-top)' }}
          >
            <div className="flex justify-between items-center px-5 pt-5 pb-3">
              <h2 className="font-semibold text-[20px] text-on-surface">Notifications</h2>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container hover:bg-surface-variant transition-colors text-on-surface-variant"
              >
                <span className="material-symbols-outlined">close</span>
              </motion.button>
            </div>

            <motion.ul variants={listVariants} initial="hidden" animate="visible" className="px-3 flex flex-col gap-1">
              {notifications.map(n => (
                <motion.li
                  key={n.id}
                  variants={itemVariants}
                  className="flex items-start gap-3 p-3 rounded-2xl hover:bg-surface-container-low transition-colors"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${n.accent ? 'bg-secondary-container/30 text-on-secondary-container' : 'bg-primary/5 text-primary'}`}>
                    <span className="material-symbols-outlined text-[20px]">{n.icon}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-[14px] text-on-surface">{n.title}</p>
                    <p className="text-[13px] text-on-surface-variant truncate">{n.body}</p>
                  </div>
                </motion.li>
              ))}
            </motion.ul>

            <div className="w-full flex justify-center pt-3">
              <div className="w-12 h-1.5 bg-surface-variant rounded-full" />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
