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
          >
            <div className="flex justify-between items-center px-5 pt-4 pb-2 border-b border-white/5">
              <h2 className="font-bold text-[18px] text-white">Notifications</h2>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 border border-white/10 text-white/80 hover:bg-white/20 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </motion.button>
            </div>

            <motion.ul variants={listVariants} initial="hidden" animate="visible" className="px-3 pt-2 flex flex-col gap-1 max-h-[60vh] overflow-y-auto hide-scrollbar">
              {notifications.map(n => (
                <motion.li
                  key={n.id}
                  variants={itemVariants}
                  className="flex items-start gap-3 p-3 rounded-2xl hover:bg-white/5 transition-colors"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${n.accent ? 'bg-secondary-container/20 text-secondary-container border border-secondary-container/10' : 'bg-white/5 text-white/80 border border-white/5'}`}>
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
