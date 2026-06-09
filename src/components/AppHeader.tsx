import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import NotificationsPanel from './NotificationsPanel';

const tabs = [
  { path: '/home', icon: 'home', label: 'Home' },
  { path: '/leaderboard', icon: 'leaderboard', label: 'Leaderboard' },
  { path: '/bookings', icon: 'event_available', label: 'Bookings' },
  { path: '/profile', icon: 'person', label: 'Profile' },
];

export default function AppHeader({ showBack = false }: { showBack?: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <header
        className={`bg-background w-full z-40 sticky top-0 transition-shadow duration-300 pt-[env(safe-area-inset-top)] border-b border-surface-variant/20 ${
          scrolled ? 'shadow-[0_2px_16px_rgba(0,52,43,0.08)]' : 'shadow-none'
        }`}
      >
        <div className="flex justify-between items-center px-5 h-[56px] w-full max-w-3xl mx-auto">
          <div className="flex items-center gap-2 text-primary">
            {showBack && (
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={() => navigate(-1)}
                className="flex items-center justify-center hover:bg-surface-container-high transition-colors rounded-full p-1 -ml-2 mr-1"
              >
                <span className="material-symbols-outlined">arrow_back</span>
              </motion.button>
            )}
            <motion.span
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ type: 'spring', damping: 16, stiffness: 200 }}
              className="material-symbols-outlined"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              sports_tennis
            </motion.span>
            <span className="font-bold text-[24px]">PlayHub</span>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-surface-container-low p-1 rounded-full border border-surface-variant/30">
            {tabs.map(tab => {
              const active = location.pathname === tab.path;
              return (
                <Link
                  key={tab.path}
                  to={tab.path}
                  className="relative px-4 py-1.5 rounded-full font-semibold text-[13px] flex items-center gap-1.5 outline-none select-none cursor-pointer"
                >
                  {active && (
                    <motion.div
                      layoutId="desktop-nav-pill"
                      transition={{ type: 'spring', damping: 28, stiffness: 350 }}
                      className="absolute inset-0 bg-primary rounded-full"
                    />
                  )}
                  <span
                    className={`relative z-10 material-symbols-outlined text-[18px] transition-colors duration-200 ${
                      active ? 'text-on-primary' : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {tab.icon}
                  </span>
                  <span
                    className={`relative z-10 transition-colors duration-200 ${
                      active ? 'text-on-primary' : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {tab.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => {
              setNotifOpen(true);
              setHasUnread(false);
            }}
            className="relative text-on-surface-variant hover:bg-surface-container-high transition-colors rounded-full p-2"
            aria-label="Notifications"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>
              notifications
            </span>
            {hasUnread && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 12, stiffness: 400, delay: 0.4 }}
                className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-error"
              />
            )}
          </motion.button>
        </div>
      </header>

      <NotificationsPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
    </>
  );
}
