import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import type { Venue, Court } from '../types';

export default function VenueDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [venue, setVenue] = useState<Venue | null>(null);
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourt, setSelectedCourt] = useState<string | null>(null);

  useEffect(() => {
    const fetchVenueAndCourts = async () => {
      if (!id) return;
      try {
        // Fetch Venue
        const venueRef = doc(db, 'venues', id);
        const venueSnap = await getDoc(venueRef);
        if (venueSnap.exists()) {
          setVenue(venueSnap.data() as Venue);
        }

        // Fetch Courts
        const courtsQuery = query(collection(db, 'courts'), where('venueId', '==', id));
        const courtsSnap = await getDocs(courtsQuery);
        const courtsList = courtsSnap.docs.map(doc => doc.data() as Court);
        setCourts(courtsList);
      } catch (err) {
        console.error('Error fetching venue details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchVenueAndCourts();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-[48px] text-primary">sync</span>
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <span className="material-symbols-outlined text-[64px] text-error mb-4">error</span>
        <h1 className="text-2xl font-bold text-on-background mb-4">Venue Not Found</h1>
        <button onClick={() => navigate('/home')} className="bg-primary text-on-primary px-6 py-2.5 rounded-full font-semibold cursor-pointer">Back to Home</button>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="bg-surface-container-lowest min-h-screen pb-[100px] antialiased"
    >
      {/* Hero Image & Navigation */}
      <div className="relative w-full h-[340px] md:h-[420px]">
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 z-10"></div>
        <img src={venue.images[0]} alt={venue.name} className="w-full h-full object-cover" />
        
        <div className="absolute top-0 left-0 right-0 max-w-3xl mx-auto w-full flex justify-between items-center px-5 pt-[calc(1.5rem+env(safe-area-inset-top))] h-auto z-20">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-surface-container-lowest/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-surface-container-lowest/30 transition-colors cursor-pointer">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className="flex gap-3">
            <button className="w-10 h-10 rounded-full bg-surface-container-lowest/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-surface-container-lowest/30 transition-colors cursor-pointer">
              <span className="material-symbols-outlined">favorite_border</span>
            </button>
            <button className="w-10 h-10 rounded-full bg-surface-container-lowest/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-surface-container-lowest/30 transition-colors cursor-pointer">
              <span className="material-symbols-outlined">share</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Canvas */}
      <main className="relative z-20 -mt-10 bg-background rounded-t-[32px] px-5 pt-8 min-h-[442px] shadow-[0_-8px_24px_rgba(0,52,43,0.08)]">
        {/* Title & Location Info */}
        <header className="mb-6">
          <div className="flex justify-between items-start mb-2">
            <h1 className="font-bold text-[28px] leading-tight text-on-background pr-4">{venue.name}</h1>
            <div className="flex items-center gap-1 bg-secondary-container/20 px-2.5 py-1 rounded-lg shrink-0">
              <span className="material-symbols-outlined text-secondary text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
              <span className="font-semibold text-[14px] text-on-secondary-container">{venue.rating}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-on-surface-variant">
            <span className="material-symbols-outlined text-primary text-[20px]">location_on</span>
            <span className="text-[14px]">{venue.address}</span>
          </div>
        </header>

        <div className="h-px w-full bg-surface-variant mb-6"></div>

        {/* Amenities */}
        <section className="mb-6">
          <h2 className="font-semibold text-[20px] text-on-background mb-4">Amenities</h2>
          <div className="flex gap-5 overflow-x-auto pb-2 hide-scrollbar">
            {venue.amenities.map(amenity => (
              <div key={amenity} className="flex flex-col items-center gap-2 min-w-[64px]">
                <div className="w-12 h-12 rounded-full bg-surface-container-low flex items-center justify-center text-primary shadow-sm">
                  <span className="material-symbols-outlined">{amenity}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Court Type Selector */}
        <section className="mb-6">
          <h2 className="font-semibold text-[20px] text-on-background mb-4">Select Court</h2>
          {courts.length === 0 ? (
            <p className="text-on-surface-variant text-[14px]">No courts configured for this venue.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {courts.map(court => {
                const isSelected = selectedCourt === court.id;
                return (
                  <button 
                    key={court.id}
                    onClick={() => setSelectedCourt(court.id)}
                    className={`text-left relative overflow-hidden rounded-2xl p-4 transition-all cursor-pointer ${
                      isSelected 
                        ? 'border-2 border-primary bg-primary/5' 
                        : 'border border-outline-variant bg-surface-container-lowest hover:border-primary/50'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <span className="material-symbols-outlined text-[14px] text-on-primary font-bold">check</span>
                      </div>
                    )}
                    <span className="material-symbols-outlined text-primary mb-3 text-[28px]">
                      {venue.type === 'pickleball' ? 'sports_tennis' : 'sports_cricket'}
                    </span>
                    <h3 className="font-semibold text-[14px] text-on-background mb-1">{court.name}</h3>
                    <p className="text-[14px] text-on-surface-variant">{court.surface}</p>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Floating Action Bar */}
      <div className="fixed bottom-0 w-full bg-surface-container-lowest pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] px-5 z-50 shadow-[0_-8px_20px_0_rgba(0,52,43,0.06)] rounded-t-2xl border-t border-surface-variant/50">
        <div className="flex justify-between items-center max-w-md mx-auto">
          <div className="flex flex-col">
            <span className="font-medium text-[12px] text-on-surface-variant">Total Price</span>
            <div className="flex items-baseline gap-1">
              <span className="font-bold text-[30px] text-primary">₹{venue.price}</span>
              <span className="text-[14px] text-on-surface-variant">/hr</span>
            </div>
          </div>
          <button 
            disabled={!selectedCourt}
            onClick={() => {
              if (selectedCourt) {
                navigate(`/venue/${venue.id}/court/${selectedCourt}/book`);
              }
            }}
            className="bg-secondary-container text-on-secondary-container font-semibold text-[20px] px-8 py-3 rounded-full min-w-[160px] h-[56px] hover:opacity-90 transition-opacity active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <span>Book Now</span>
            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
