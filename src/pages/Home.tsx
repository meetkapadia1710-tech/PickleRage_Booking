import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import type { Venue } from '../types';
import AppHeader from '../components/AppHeader';
import SmartImage from '../components/SmartImage';
import { getMapSearchUrl, openExternal } from '../lib/maps';

const cardVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, damping: 26, stiffness: 260, delay: i * 0.07 },
  }),
};

const filterOptions = [
  { value: 'all', label: 'All', icon: 'dashboard' },
  { value: 'pickleball', label: 'Pickleball', icon: 'sports_tennis' },
  { value: 'box cricket', label: 'Box Cricket', icon: 'sports_cricket' },
] as const;

export default function Home() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"all" | "pickleball" | "box cricket">("all");
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getDocs(collection(db, 'venues'))
      .then(snap => {
        if (cancelled) return;
        // Merge in the document id — venues created from the admin panel don't store one in their data.
        setVenues(snap.docs.map(d => {
          const data = d.data() as Venue;
          const id = d.id;
          if (id === 'venue_1') {
            data.address = 'nr Shravan Chowkdi, Link Rd, opp. Ganesh Township, PickleRage, Bharuch, Gujarat 392001';
          } else if (id === 'venue_3') {
            data.name = 'SPORTS PLANET';
            data.address = 'City Centre, Railway Station Rd, Moficer Jin Compound, Bharuch, Gujarat 392001';
          }
          return { ...data, id };
        }));
        setLoading(false);
      })
      .catch(err => {
        if (cancelled) return;
        console.error('Error fetching venues:', err);
        setError(true);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [reloadKey]);

  const retryFetch = () => {
    setLoading(true);
    setError(false);
    setReloadKey(k => k + 1);
  };

  const filteredVenues = filter === 'all'
    ? venues
    : venues.filter(v => v.type === filter);

  const handleViewMap = () => {
    navigate('/map');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.14 }}
      className="antialiased min-h-screen flex flex-col pb-28 bg-background text-on-background"
    >
      <AppHeader />

      <main className="flex-grow px-5 pt-2 pb-6 max-w-3xl md:max-w-5xl lg:max-w-6xl xl:max-w-7xl mx-auto w-full animate-fadeIn">
        {/* Category Filters for Mobile (iOS Segmented Control style) - Hidden on desktop */}
        <section className="px-1 max-w-md mx-auto w-full mb-6 lg:hidden">
          <div className="bg-surface-container-low/75 border border-outline-variant/45 p-0.5 xs:p-1 rounded-full flex gap-0.5 xs:gap-1 relative overflow-hidden shadow-sm">
            {filterOptions.map(opt => {
              const active = filter === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setFilter(opt.value)}
                  className="relative flex-1 py-1.5 xs:py-2 rounded-full font-semibold text-[2.9vw] xs:text-[12px] sm:text-[13px] md:text-[14px] flex items-center justify-center gap-1 xs:gap-1.5 select-none cursor-pointer transition-transform active:scale-95 duration-150 whitespace-nowrap"
                >
                  {active && (
                    <motion.div
                      layoutId="active-filter-pill"
                      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                      className="absolute inset-0 bg-gradient-to-r from-primary to-[#004d40] shadow-[0_2px_8px_rgba(0,52,43,0.18)] rounded-full z-0"
                    />
                  )}
                  <span
                    className={`relative z-10 material-symbols-outlined text-[3.8vw] xs:text-[15px] md:text-[17px] transition-colors duration-200 ${
                      active ? 'text-white' : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {opt.icon}
                  </span>
                  <span
                    className={`relative z-10 transition-colors duration-200 ${
                      active ? 'text-white' : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
          {/* Left Sidebar (Desktop Only) */}
          <aside className="hidden lg:flex flex-col gap-5 w-full lg:w-[260px] shrink-0 sticky top-24">
            <div className="bg-surface-container-lowest border border-outline-variant/65 p-4 rounded-3xl flex flex-col gap-2 shadow-[0_8px_30px_rgba(0,52,43,0.04)]">
              <h3 className="font-bold text-[13px] text-on-surface-variant uppercase tracking-wider px-2 mb-1">Categories</h3>
              {filterOptions.map(opt => {
                const active = filter === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setFilter(opt.value)}
                    className="relative w-full py-3 px-4 rounded-2xl font-bold text-[14px] flex items-center gap-3 select-none cursor-pointer transition-all duration-150 text-left active:scale-[0.98]"
                  >
                    {active && (
                      <motion.div
                        layoutId="active-filter-pill-desktop"
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="absolute inset-0 bg-gradient-to-r from-primary to-[#004d40] shadow-[0_4px_12px_rgba(0,52,43,0.18)] rounded-2xl z-0"
                      />
                    )}
                    <span
                      className={`relative z-10 material-symbols-outlined text-[20px] transition-colors duration-200 ${
                        active ? 'text-white' : 'text-on-surface-variant'
                      }`}
                    >
                      {opt.icon}
                    </span>
                    <span
                      className={`relative z-10 transition-colors duration-200 ${
                        active ? 'text-white' : 'text-on-surface'
                      }`}
                    >
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Map Card */}
            <div className="bg-surface-container-lowest border border-outline-variant/65 p-5 rounded-3xl flex flex-col gap-3.5 shadow-[0_8px_30px_rgba(0,52,43,0.04)]">
              <div className="flex items-center gap-2 text-primary">
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>explore</span>
                <span className="font-extrabold text-[14px]">Explore Venues</span>
              </div>
              <p className="text-[13px] text-on-surface-variant leading-relaxed font-medium">
                Find nearby courts and grounds instantly on the interactive map.
              </p>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleViewMap}
                className="w-full py-3 rounded-2xl bg-primary text-on-primary font-bold text-[14px] cursor-pointer flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(0,82,68,0.2)] hover:opacity-95 transition-opacity"
              >
                <span className="material-symbols-outlined text-[18px]">map</span>
                View map
              </motion.button>
            </div>
          </aside>

          {/* Main Content Area */}
          <section className="flex-grow w-full flex flex-col gap-4">
            <div className="flex justify-between items-end mb-2">
              <h2 className="font-extrabold text-[22px] lg:text-[24px] text-on-background tracking-tight">Nearby Venues</h2>
              <motion.button
                whileTap={{ scale: 0.93 }}
                onClick={handleViewMap}
                className="lg:hidden font-semibold text-[14px] text-primary cursor-pointer flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">map</span>
                View map
              </motion.button>
            </div>

            {loading ? (
              <div className="flex flex-col gap-4 md:grid md:grid-cols-2 xl:grid-cols-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-surface-container-lowest rounded-[20px] overflow-hidden border border-outline-variant/65 animate-pulse">
                    <div className="aspect-video bg-surface-container-high" />
                    <div className="p-4 space-y-3">
                      <div className="h-5 bg-surface-container-high rounded w-2/3" />
                      <div className="h-4 bg-surface-container-high rounded w-1/2" />
                      <div className="h-9 bg-surface-container-high rounded-full w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="bg-surface-container-lowest rounded-2xl p-8 text-center border border-outline-variant/65 flex flex-col items-center gap-3">
                <span className="material-symbols-outlined text-[40px] text-error">cloud_off</span>
                <p className="text-on-surface font-semibold">Couldn't load venues</p>
                <p className="text-[13px] text-on-surface-variant">Check your connection and try again.</p>
                <button
                  onClick={retryFetch}
                  className="mt-1 px-6 py-2.5 rounded-full bg-primary text-on-primary font-semibold text-[14px] cursor-pointer hover:opacity-90 transition-opacity"
                >
                  Try Again
                </button>
              </div>
            ) : filteredVenues.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center text-on-surface-variant py-12 font-medium bg-surface-container-low/50 rounded-2xl border border-dashed border-outline-variant/65 px-6"
              >
                No venues found. Add venues in the Admin Dashboard.
              </motion.div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={filter}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  className="flex flex-col gap-4 md:grid md:grid-cols-2 xl:grid-cols-3"
                >
                  {filteredVenues.map((venue, i) => (
                    <motion.article
                      key={venue.id}
                      custom={i}
                      variants={cardVariants}
                      initial="hidden"
                      animate="visible"
                      whileTap={{ scale: 0.97 }}
                      onClick={() => navigate(`/venue/${venue.id}`)}
                      className="bg-surface-container-lowest rounded-[20px] overflow-hidden flex flex-col cursor-pointer border border-outline-variant/65 shadow-[0_4px_16px_rgba(0,52,43,0.06)] hover:shadow-[0_8px_30px_rgba(0,52,43,0.12)] transition-shadow duration-300"
                    >
                      <SmartImage src={venue.images?.[0]} alt={venue.name}>
                        {/* Rating pill removed */}
                      </SmartImage>
                      <div className="p-4 flex flex-col gap-2">
                        <div>
                          <h3 className="font-bold text-[18px] leading-tight text-on-background mb-1">{venue.name}</h3>
                          <p className="text-[14px] text-on-surface-variant flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px]">location_on</span>
                            {venue.address.split(',').slice(1).join(',').trim() || venue.address}
                          </p>
                        </div>
                        <div className="mt-2 flex justify-between items-center border-t border-surface-variant pt-3">
                          <span className="font-semibold text-[14px] text-on-surface">
                            <span className="font-bold text-[16px]">₹{venue.price}</span>/hr
                          </span>
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={e => { e.stopPropagation(); navigate(`/venue/${venue.id}`); }}
                            className="bg-secondary-container text-on-secondary-container px-5 py-2 rounded-full font-semibold text-[14px] cursor-pointer"
                          >
                            Book
                          </motion.button>
                        </div>
                      </div>
                    </motion.article>
                  ))}
                </motion.div>
              </AnimatePresence>
            )}
          </section>
        </div>
      </main>
    </motion.div>
  );
}

