import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

const tabs = [
  { path: '/home', icon: 'home', label: 'Home' },
  { path: '/leaderboard', icon: 'leaderboard', label: 'Leaderboard' },
  { path: '/bookings', icon: 'event_available', label: 'Bookings' },
  { path: '/profile', icon: 'person', label: 'Profile' },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const visible = tabs.some(t => t.path === location.pathname);

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
    <AnimatePresence>
      {visible && (
        <motion.nav
          initial={{ y: 96 }}
          animate={{ y: 0 }}
          exit={{ y: 96 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="md:hidden bg-surface-container-lowest shadow-[0_-4px_12px_0_rgba(0,52,43,0.04)] fixed bottom-0 w-full z-50 flex flex-col rounded-t-xl border-t border-surface-variant/50"
        >
          <div className="flex items-stretch px-2 pt-1">
            {tabs.map(tab => {
              const active = location.pathname === tab.path;
              return (
                <button
                  key={tab.path}
                  onClick={() => handleTab(tab.path, active)}
                  className="relative flex flex-col items-center justify-center flex-1 h-[58px] outline-none"
                  aria-current={active ? 'page' : undefined}
                >
                  {active && (
                    <motion.div
                      layoutId="nav-pill"
                      transition={{ type: 'spring', damping: 28, stiffness: 350 }}
                      className="absolute inset-x-1 inset-y-1 bg-secondary-container rounded-full"
                    />
                  )}
                  <motion.span
                    animate={{ scale: active ? 1.08 : 1 }}
                    transition={{ type: 'spring', damping: 14, stiffness: 400 }}
                    className={`relative z-10 material-symbols-outlined transition-colors duration-200 ${
                      active ? 'text-on-secondary-container' : 'text-on-surface-variant'
                    }`}
                    style={{ fontVariationSettings: `'FILL' ${active ? 1 : 0}` }}
                  >
                    {tab.icon}
                  </motion.span>
                  <span
                    className={`relative z-10 font-medium text-[10px] mt-0.5 whitespace-nowrap transition-colors duration-200 ${
                      active ? 'text-on-secondary-container' : 'text-on-surface-variant'
                    }`}
                  >
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
          {/* Safe area spacer for home indicator / gesture bar */}
          <div style={{ height: 'env(safe-area-inset-bottom)' }} />
        </motion.nav>
      )}
    </AnimatePresence>
  );
}
