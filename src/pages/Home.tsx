import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { mockVenues } from '../data/mockVenues';

export default function Home() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"all" | "pickleball" | "box cricket">("all");

  const filteredVenues = filter === "all" 
    ? mockVenues 
    : mockVenues.filter(v => v.type === filter);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="antialiased min-h-screen flex flex-col pb-24 bg-background text-on-background"
    >
      {/* TopAppBar */}
      <header className="bg-background dark:bg-on-background w-full z-40 sticky top-0">
        <div className="flex justify-between items-center px-5 h-[48px] w-full">
          <div className="flex items-center gap-2 text-primary">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>sports_tennis</span>
            <span className="font-bold text-[24px]">PlayHub</span>
          </div>
          <button className="text-on-surface-variant hover:bg-surface-container-high transition-colors active:scale-95 rounded-full p-2">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>notifications</span>
          </button>
        </div>
      </header>

      {/* Main Content Canvas */}
      <main className="flex-grow px-5 pt-2 pb-6 flex flex-col gap-6 max-w-3xl mx-auto w-full">
        {/* Search Bar */}
        <section>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-outline">search</span>
            </div>
            <input 
              type="text" 
              placeholder="Find courts, venues, cities..." 
              className="block w-full pl-11 pr-4 py-3 bg-surface-container-low border-[1.5px] border-outline-variant rounded-xl text-on-surface text-[16px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors placeholder-on-surface-variant/70"
            />
            <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
              <button className="p-2 text-primary hover:bg-surface-container-high rounded-lg transition-colors">
                <span className="material-symbols-outlined">tune</span>
              </button>
            </div>
          </div>
        </section>

        {/* Category Filters */}
        <section>
          <div className="flex overflow-x-auto gap-2 pb-2 -mx-5 px-5 snap-x hide-scrollbar">
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
            <button className="font-semibold text-[14px] text-primary hover:opacity-80 transition-opacity">View map</button>
          </div>

          {filteredVenues.map(venue => (
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
                  <button className="bg-secondary-container text-on-secondary-container px-4 py-2 rounded-full font-semibold text-[14px] transition-transform active:scale-95">Book</button>
                </div>
              </div>
            </motion.article>
          ))}
        </section>
      </main>

      {/* BottomNavBar */}
      <nav className="md:hidden bg-surface-container-lowest shadow-[0_-4px_12px_0_rgba(0,52,43,0.04)] fixed bottom-0 w-full z-50 flex justify-around items-center px-4 py-2 rounded-t-xl border-t border-surface-variant/50">
        <button className="flex flex-col items-center justify-center bg-secondary-container text-on-secondary-container rounded-full px-6 py-1">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>home</span>
          <span className="font-medium text-[12px] mt-1">Home</span>
        </button>
        <button onClick={() => navigate('/bookings')} className="flex flex-col items-center justify-center text-on-surface-variant hover:opacity-80 py-1">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>event_available</span>
          <span className="font-medium text-[12px] mt-1">My Bookings</span>
        </button>
        <button onClick={() => navigate('/profile')} className="flex flex-col items-center justify-center text-on-surface-variant hover:opacity-80 py-1">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>person</span>
          <span className="font-medium text-[12px] mt-1">Profile</span>
        </button>
      </nav>
    </motion.div>
  );
}

function FilterButton({ label, icon, active, onClick }: { label: string, icon: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`snap-start shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-[14px] transition-transform active:scale-95 ${
        active 
          ? 'bg-primary text-on-primary shadow-sm' 
          : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
      }`}
    >
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
      {label}
    </button>
  );
}
