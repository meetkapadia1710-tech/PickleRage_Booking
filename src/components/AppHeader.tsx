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
        className={`w-full z-40 sticky top-0 transition-all duration-300 pt-[env(safe-area-inset-top)] border-b backdrop-blur-[14px] ${
          scrolled
            ? 'bg-surface-container-lowest/80 border-outline-variant/65 shadow-[0_8px_30px_rgba(0,52,43,0.06)]'
            : 'bg-background/40 border-transparent shadow-none'
        }`}
      >
        <div className="flex justify-between items-center px-5 h-[64px] w-full max-w-3xl mx-auto">
          <div className="flex items-center gap-2.5">
            {showBack && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate(-1)}
                className="flex items-center justify-center w-10 h-10 rounded-full border border-outline-variant/50 bg-surface-container-low/40 text-on-surface hover:bg-surface-container-high transition-all duration-300 -ml-1 mr-0.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              </motion.button>
            )}
            <div className="flex items-center gap-2">
              <motion.div
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                transition={{ type: 'spring', damping: 16, stiffness: 200 }}
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary-container/20 border border-primary/10 shadow-[0_2px_8px_rgba(0,52,43,0.05)]"
              >
                <span
                  className="material-symbols-outlined text-primary text-[20px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  sports_tennis
                </span>
              </motion.div>
              <span className="font-extrabold text-[22px] tracking-tight bg-gradient-to-r from-primary via-primary/95 to-[#005e4e] bg-clip-text text-transparent">
                PlayHub
              </span>
            </div>
          </div>
 
          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-surface-container-low/50 backdrop-blur-md p-1.5 rounded-full border border-outline-variant/35 hover:border-outline-variant/60 transition-colors duration-300">
            {tabs.map(tab => {
              const active = location.pathname === tab.path;
              return (
                <Link
                  key={tab.path}
                  to={tab.path}
                  className="relative px-4 py-1.5 rounded-full font-semibold text-[13px] flex items-center gap-1.5 outline-none select-none cursor-pointer transition-transform duration-200 active:scale-95"
                >
                  {active && (
                    <motion.div
                      layoutId="desktop-nav-pill"
                      transition={{ type: 'spring', damping: 28, stiffness: 350 }}
                      className="absolute inset-0 bg-gradient-to-r from-primary to-[#004d40] shadow-[0_2px_10px_rgba(0,52,43,0.2)] rounded-full"
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

          {/* Right action buttons */}
          <div className="flex items-center gap-2">
            {/* Leaderboard shortcut */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate('/leaderboard')}
              className={`relative flex items-center justify-center w-10 h-10 rounded-full border transition-all duration-300 cursor-pointer ${
                location.pathname === '/leaderboard'
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-outline-variant/50 bg-surface-container-low/40 text-on-surface hover:bg-surface-container-high'
              }`}
              aria-label="Leaderboard"
            >
              <span className="material-symbols-outlined text-[22px]"
                style={{ fontVariationSettings: `'FILL' ${location.pathname === '/leaderboard' ? 1 : 0}` }}>
                leaderboard
              </span>
            </motion.button>

            {/* Notifications */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                setNotifOpen(true);
                setHasUnread(false);
              }}
              className="relative flex items-center justify-center w-10 h-10 rounded-full border border-outline-variant/50 bg-surface-container-low/40 text-on-surface hover:bg-surface-container-high transition-all duration-300 cursor-pointer"
              aria-label="Notifications"
            >
              <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 0" }}>
                notifications
              </span>
              {hasUnread && (
                <span className="absolute top-2.5 right-2.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-error"></span>
                </span>
              )}
            </motion.button>
          </div>
        </div>
      </header>

      <NotificationsPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
    </>
  );
}
