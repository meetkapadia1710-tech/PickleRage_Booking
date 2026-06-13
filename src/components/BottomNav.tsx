import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

const tabs = [
  { path: '/home',     icon: 'home',            label: 'Home' },
  { path: '/friends',  icon: 'group',           label: 'Friends' },
  { path: '/bookings', icon: 'event_available', label: 'Bookings' },
  { path: '/profile',  icon: 'person',          label: 'Profile' },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const visible = tabs.some(t => t.path === location.pathname);

  // Pending friend request badge count
  const [pendingCount, setPendingCount] = useState(0);
  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'friendRequests'),
      where('toUid', '==', currentUser.uid),
      where('status', '==', 'pending'),
    );
    return onSnapshot(
      q,
      snap => setPendingCount(snap.size),
      err => console.warn('BottomNav friend requests query error:', err)
    );
  }, [currentUser]);

  const handleTab = async (path: string, active: boolean) => {
    if (active) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      // haptics unavailable on web
    }
    navigate(path);
  };

  return (
    <AnimatePresence mode="wait">
      {visible && (
        <motion.nav
          layout="position"
          initial={{ y: 96 }}
          animate={{ y: 0 }}
          exit={{ y: 96 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="md:hidden fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom))] left-3 right-3 max-w-lg mx-auto z-50 bg-black/25 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.2)] flex flex-col rounded-full border border-white/20"
        >
          <div className="flex items-stretch px-1.5 py-1.5">
            {tabs.map(tab => {
              const active = location.pathname === tab.path;
              const hasBadge = tab.path === '/friends' && pendingCount > 0;
              return (
                <button
                  key={tab.path}
                  onClick={() => handleTab(tab.path, active)}
                  className="relative flex flex-col items-center justify-center flex-1 h-[64px] outline-none"
                  aria-current={active ? 'page' : undefined}
                >
                  {active && (
                    <motion.div
                      layoutId="nav-pill"
                      transition={{ type: 'spring', damping: 28, stiffness: 350 }}
                      className="absolute inset-x-1 inset-y-1 bg-secondary-container rounded-full"
                    />
                  )}
                  <div className="relative z-10">
                    <motion.span
                      animate={{ scale: active ? 1.08 : 1 }}
                      transition={{ type: 'spring', damping: 14, stiffness: 400 }}
                      className={`material-symbols-outlined transition-colors duration-200 text-[22px] ${
                        active ? 'text-on-secondary-container' : 'text-white mix-blend-difference'
                      }`}
                      style={{ fontVariationSettings: `'FILL' ${active ? 1 : 0}` }}
                    >
                      {tab.icon}
                    </motion.span>
                    {hasBadge && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-error rounded-full flex items-center justify-center text-[9px] font-bold text-white">
                        {pendingCount > 9 ? '9+' : pendingCount}
                      </span>
                    )}
                  </div>
                  <span
                    className={`relative z-10 font-medium text-[9px] -mt-0.5 leading-none whitespace-nowrap transition-colors duration-200 ${
                      active ? 'text-on-secondary-container' : 'text-white mix-blend-difference'
                    }`}
                  >
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}
