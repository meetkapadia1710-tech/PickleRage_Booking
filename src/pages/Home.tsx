import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import type { Venue } from '../types';
import AppHeader from '../components/AppHeader';

export default function Home() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"all" | "pickleball" | "box cricket">("all");
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVenues = async () => {
      try {
        const venuesSnap = await getDocs(collection(db, 'venues'));
        const venuesList = venuesSnap.docs.map(doc => doc.data() as Venue);
        setVenues(venuesList);
      } catch (err) {
        console.error('Error fetching venues:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchVenues();
  }, []);

  const filteredVenues = filter === 'all'
    ? venues
    : venues.filter(v => v.type === filter);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="antialiased min-h-screen flex flex-col pb-24 bg-background text-on-background"
    >
      {/* TopAppBar */}
      <AppHeader />

      {/* Main Content Canvas */}
      <main className="flex-grow px-5 pt-2 pb-6 flex flex-col gap-6 max-w-3xl mx-auto w-full">
        {/* Category Filters */}
        <section>
          <div className="flex overflow-x-auto gap-2 pb-2 -mx-5 px-5 snap-x hide-scrollbar md:overflow-visible md:justify-center md:gap-3 md:mx-0 md:px-0">
            <FilterButton 
              label="All" 
              icon="dashboard" 
              active={filter === "all"} 
              onClick={() => setFilter("all")} 
            />
            <FilterButton 
              label="Pickleball" 
              icon="sports_tennis" 
              active={filter === "pickleball"} 
              onClick={() => setFilter("pickleball")} 
            />
            <FilterButton 
              label="Box Cricket" 
              icon="sports_cricket" 
              active={filter === "box cricket"} 
              onClick={() => setFilter("box cricket")} 
            />
          </div>
        </section>

        {/* Featured Venues */}
        <section className="flex flex-col gap-4 md:grid md:grid-cols-2">
          <div className="flex justify-between items-end md:col-span-2 mb-2">
            <h2 className="font-semibold text-[20px] text-on-background">Nearby Venues</h2>
            <button className="font-semibold text-[14px] text-primary hover:opacity-80 transition-opacity cursor-pointer">View map</button>
          </div>

          {loading ? (
            <div className="md:col-span-2 flex justify-center py-12">
              <span className="material-symbols-outlined animate-spin text-[36px] text-primary">sync</span>
            </div>
          ) : filteredVenues.length === 0 ? (
            <div className="md:col-span-2 text-center text-on-surface-variant py-12 font-medium bg-surface-container-low/50 rounded-2xl border border-dashed border-outline-variant/30 px-6">
              No venues found. Make sure to run the database seeding function in the Admin Dashboard (`/admin`).
            </div>
          ) : (
            filteredVenues.map(venue => (
              <motion.article 
                key={venue.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(`/venue/${venue.id}`)}
                className="bg-surface-container-lowest rounded-[20px] overflow-hidden flex flex-col group cursor-pointer shadow-[0_4px_12px_rgba(0,52,43,0.04)]"
              >
                <div className="relative h-48 w-full">
                  <img src={venue.images[0]} alt={venue.name} className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                  <div className="absolute top-3 right-3 bg-surface-container-lowest/90 backdrop-blur-sm rounded-full px-2.5 py-1 flex items-center gap-1 shadow-sm">
                    <span className="material-symbols-outlined text-[14px] text-secondary-container" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    <span className="font-medium text-[12px] text-on-surface">{venue.rating}</span>
                  </div>
                </div>
                <div className="p-4 flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-[18px] leading-tight text-on-background mb-1">{venue.name}</h3>
                      <p className="text-[14px] text-on-surface-variant flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">location_on</span>
                        {venue.distance} • {venue.address.split(',')[1]?.trim() || venue.address}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex justify-between items-center border-t border-surface-variant pt-3">
                    <span className="font-semibold text-[14px] text-on-surface">
                      <span className="font-bold text-[16px]">₹{venue.price}</span>/hr
                    </span>
                    <button className="bg-secondary-container text-on-secondary-container px-4 py-2 rounded-full font-semibold text-[14px] transition-transform active:scale-95 cursor-pointer">Book</button>
                  </div>
                </div>
              </motion.article>
            ))
          )}
        </section>
      </main>
    </motion.div>
  );
}

function FilterButton({ label, icon, active, onClick }: { label: string, icon: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`snap-start shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 md:gap-2 md:px-5 md:py-2.5 rounded-full font-semibold text-[13px] md:text-[14px] transition-transform active:scale-95 cursor-pointer ${
        active 
          ? 'bg-primary text-on-primary shadow-sm' 
          : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
      }`}
    >
      <span className="material-symbols-outlined text-[16px] md:text-[18px]">{icon}</span>
      {label}
    </button>
  );
}
