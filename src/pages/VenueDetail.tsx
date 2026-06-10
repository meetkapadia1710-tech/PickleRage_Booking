import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import type { Venue, Court } from '../types';
import { getMapEmbedUrl, getDirectionsUrl, hasLocation, openExternal } from '../lib/maps';
import { isFavorite, toggleFavorite } from '../lib/store';
import Toast from '../components/Toast';

export default function VenueDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [venue, setVenue] = useState<Venue | null>(null);
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourt, setSelectedCourt] = useState<string | null>(null);
  const [fav, setFav] = useState(() => (id ? isFavorite(id) : false));

  useEffect(() => {
    const fetchVenueAndCourts = async () => {
      if (!id) return;
      try {
        // Fetch Venue (merge in doc id — admin-created venues don't store one in data)
        const venueRef = doc(db, 'venues', id);
        const venueSnap = await getDoc(venueRef);
        if (venueSnap.exists()) {
          const data = venueSnap.data() as Venue;
          const id = venueSnap.id;
          if (id === 'venue_1') {
            data.address = 'Picklerage, Shravan Chowkdi, Opposite Ganesh Township, Bholav, Bharuch 392001';
          } else if (id === 'venue_3') {
            data.name = 'SPORTS PLANET';
            data.address = 'City Centre, Railway Station Rd, Moficer Jin Compound, Bharuch, Gujarat 392001';
          }
          setVenue({ ...data, id });
        }

        // Fetch Courts
        const courtsQuery = query(collection(db, 'courts'), where('venueId', '==', id));
        const courtsSnap = await getDocs(courtsQuery);
        const courtsList = courtsSnap.docs.map(d => ({ ...(d.data() as Court), id: d.id }));
        setCourts(courtsList);
      } catch (err) {
        console.error('Error fetching venue details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchVenueAndCourts();
  }, [id]);

  // Toast State
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [toastIcon, setToastIcon] = useState<string | undefined>(undefined);
  const showToast = (msg: string, icon?: string) => {
    setToastMsg(msg);
    setToastIcon(icon);
    setTimeout(() => {
      setToastMsg(null);
    }, 2200);
  };

  const handleToggleFavorite = () => {
    if (id) {
      const nextFav = toggleFavorite(id);
      setFav(nextFav);
      showToast(nextFav ? 'Added to Favorites' : 'Removed from Favorites', nextFav ? 'favorite' : 'favorite_border');
    }
  };

  const handleShare = async () => {
    if (!venue) return;
    const shareData = {
      title: venue.name,
      text: `Check out ${venue.name} on PlayHub — ₹${venue.price}/hr`,
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
        showToast('Link copied to clipboard!', 'content_copy');
      }
    } catch {
      // user dismissed the share sheet — nothing to do
    }
  };

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
        {venue.images?.[0] ? (
          <img src={venue.images[0]} alt={venue.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-b from-primary to-[#001a14] flex items-center justify-center">
            <span className="material-symbols-outlined text-[72px] text-white/30">
              {venue.type === 'pickleball' ? 'sports_tennis' : 'sports_cricket'}
            </span>
          </div>
        )}

        <div className="absolute top-0 left-0 right-0 max-w-3xl mx-auto w-full flex justify-between items-center px-5 pt-[calc(1.5rem+env(safe-area-inset-top))] h-auto z-20">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-surface-container-lowest/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-surface-container-lowest/30 transition-colors cursor-pointer">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className="flex gap-3">
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={handleToggleFavorite}
              aria-label={fav ? 'Remove from favorites' : 'Add to favorites'}
              className="w-10 h-10 rounded-full bg-surface-container-lowest/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-surface-container-lowest/30 transition-colors cursor-pointer"
            >
              <span
                className={`material-symbols-outlined transition-colors ${fav ? 'text-red-400' : ''}`}
                style={{ fontVariationSettings: `'FILL' ${fav ? 1 : 0}` }}
              >
                favorite
              </span>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={handleShare}
              aria-label="Share venue"
              className="w-10 h-10 rounded-full bg-surface-container-lowest/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-surface-container-lowest/30 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined">share</span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Main Content Canvas */}
      <main className="relative z-20 -mt-10 bg-background rounded-t-[32px] px-5 pt-8 min-h-[442px] shadow-[0_-8px_24px_rgba(0,52,43,0.08)]">
        {/* Title & Location Info */}
        <header className="mb-6">
          <h1 className="font-bold text-[28px] leading-tight text-on-background mb-1">{venue.name}</h1>
          {/* Rating + Hours row */}
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-amber-500" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
              <span className="font-semibold text-[13px] text-on-surface">{venue.rating}</span>
              {venue.ratingCount && (
                <span className="text-[12px] text-on-surface-variant">({venue.ratingCount} ratings)</span>
              )}
            </div>
            {venue.openHours && (
              <>
                <span className="text-on-surface-variant text-[12px]">•</span>
                <span className="text-[12px] text-on-surface-variant">{venue.openHours}</span>
              </>
            )}
          </div>
          <div className="flex justify-between items-start gap-4">
            <div className="flex items-start gap-1.5 text-on-surface-variant flex-1 min-w-0">
              <span className="material-symbols-outlined text-primary text-[18px] shrink-0 mt-0.5">location_on</span>
              <span className="text-[11px] leading-snug">{venue.address}</span>
            </div>
            <button
              onClick={() => {
                const reviewUrls: Record<string, string> = {
                  venue_1: 'https://maps.app.goo.gl/5rKScgBhtYwhYk35A',
                  venue_3: 'https://maps.app.goo.gl/hJXz5AXDQkpCL5Uj8',
                };
                const targetUrl = reviewUrls[venue.id] || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venue.name} ${venue.address}`)}`;
                openExternal(targetUrl);
              }}
              className="bg-secondary-container/20 hover:bg-secondary-container/30 border border-secondary-container/30 px-2 py-0.5 rounded-full flex items-center gap-0.5 text-[10px] font-semibold text-on-secondary-container transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
            >
              <span className="material-symbols-outlined text-[11px] text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
              Rate on Google
            </button>
          </div>
        </header>

        <div className="h-px w-full bg-surface-variant mb-6"></div>

        {/* Court Type Selector */}
        <section className="mb-6">
          <h2 className="font-semibold text-[20px] text-on-background mb-4">Select Court</h2>
          {courts.length === 0 ? (
            <p className="text-on-surface-variant text-[14px]">No courts configured for this venue.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {courts.map((court, idx) => {
                const isSelected = selectedCourt === court.id;
                const isPickleball = venue.type === 'pickleball';
                const courtDetails = isPickleball
                  ? idx === 0
                    ? {
                        badge: 'Court A',
                        title: 'Professional Grade Court',
                        desc: 'Features state-of-the-art shock-absorbing cushion layers, precise markings, and high-intensity glare-free LED floodlights for perfect night play.',
                        img: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?q=80&w=600&auto=format&fit=crop',
                      }
                    : {
                        badge: 'Court B',
                        title: 'Tropical Oasis Court',
                        desc: 'Play surrounded by our signature lush vertical plant walls and hanging greenery, delivering a scenic and relaxing resort-style athletic escape.',
                        img: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?q=80&w=600&auto=format&fit=crop',
                      }
                  : null;

                if (courtDetails) {
                  return (
                    <button
                      key={court.id}
                      onClick={() => setSelectedCourt(court.id)}
                      className={`text-left relative overflow-hidden rounded-[24px] h-[220px] transition-all cursor-pointer border-2 ${
                        isSelected 
                          ? 'border-primary ring-2 ring-primary/20 scale-[1.01]' 
                          : 'border-transparent hover:scale-[1.005]'
                      }`}
                    >
                      {/* Image & Overlay */}
                      <img src={courtDetails.img} alt={courtDetails.title} className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/20 z-10" />

                      {/* Selection Check */}
                      {isSelected && (
                        <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-primary flex items-center justify-center z-20 shadow-md">
                          <span className="material-symbols-outlined text-[15px] text-on-primary font-bold">check</span>
                        </div>
                      )}

                      {/* Content */}
                      <div className="absolute inset-0 p-5 flex flex-col justify-between z-20 text-white">
                        <span className="self-start px-3 py-1 text-[11px] font-bold uppercase tracking-wider rounded-full bg-secondary-container text-on-secondary-container shadow-sm">
                          {courtDetails.badge}
                        </span>
                        <div>
                          <h3 className="font-bold text-[18px] mb-1.5">{courtDetails.title}</h3>
                          <p className="text-[12px] text-white/85 leading-relaxed line-clamp-3">{courtDetails.desc}</p>
                        </div>
                      </div>
                    </button>
                  );
                }

                // Fallback for Box Cricket
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
                      sports_cricket
                    </span>
                    <h3 className="font-semibold text-[14px] text-on-background mb-1">{court.name}</h3>
                    <p className="text-[14px] text-on-surface-variant">{court.surface}</p>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Info Cards (iOS style highlights, rules, policies) */}
        {venue.type === 'pickleball' && (
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 mt-4">
            {/* Club Highlights */}
            <div className="bg-surface-container-lowest p-5 rounded-[24px] border border-outline-variant/65 shadow-[0_4px_16px_rgba(0,52,43,0.06)] flex flex-col gap-4">
              <h3 className="font-bold text-[18px] text-on-background pb-1 border-b-2 border-primary/10">Highlights</h3>
              <div className="flex gap-2">
                <div className="flex-1 bg-surface-container-low px-3 py-2 rounded-xl text-center">
                  <span className="block text-[10px] uppercase tracking-wider text-on-surface-variant font-medium">Hours</span>
                  <span className="font-bold text-[12px] text-on-surface">{venue.openHours ?? '6 AM – 11:59 PM'}</span>
                </div>
                <div className="flex-1 bg-surface-container-low px-3 py-2 rounded-xl text-center">
                  <span className="block text-[10px] uppercase tracking-wider text-on-surface-variant font-medium">Pricing</span>
                  <span className="font-bold text-[12px] text-on-surface">₹{venue.price} onwards</span>
                </div>
              </div>
              {/* Free Equipment highlight */}
              {venue.highlights && venue.highlights.length > 0 && (
                <div className="bg-primary-container/20 border border-primary/10 px-3.5 py-2.5 rounded-xl flex flex-wrap gap-x-3 gap-y-1">
                  {venue.highlights.map(h => (
                    <span key={h} className="font-semibold text-[12px] text-primary flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      {h}
                    </span>
                  ))}
                </div>
              )}
              <ul className="flex flex-col gap-2.5 text-[13px] text-on-surface-variant">
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-primary font-bold">check</span>
                  <span>Floodlit Courts (Professional LED Lighting)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-primary font-bold">check</span>
                  <span>Online Booking (Instant Phone Confirmation)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-primary font-bold">check</span>
                  <span>Drinking Water Available</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-primary font-bold">check</span>
                  <span>Food Court</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-primary font-bold">check</span>
                  <span>Parking Available</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-primary font-bold">check</span>
                  <span>First Aid</span>
                </li>
              </ul>
              {/* Offers */}
              {venue.offers && venue.offers.length > 0 && (
                <div>
                  <h4 className="font-bold text-[13px] text-on-surface mb-2">Offers</h4>
                  {venue.offers.map(offer => (
                    <div key={offer.label} className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/40 px-3 py-2.5 rounded-xl flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[14px]">🏷️</span>
                        <span className="font-semibold text-[12px] text-green-700 dark:text-green-400">{offer.label}</span>
                      </div>
                      <span className="text-[11px] text-green-600 dark:text-green-500 underline cursor-pointer">{offer.detail}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Venue Rules */}
            <div className="bg-surface-container-lowest p-5 rounded-[24px] border border-outline-variant/65 shadow-[0_4px_16px_rgba(0,52,43,0.06)] flex flex-col gap-4">
              <h3 className="font-bold text-[18px] text-on-background pb-1 border-b-2 border-primary/10">Venue Rules</h3>
              <div className="flex flex-col gap-4">
                <div className="flex gap-3">
                  <span className="text-[20px] shrink-0">⏰</span>
                  <div>
                    <h4 className="font-bold text-[13px] text-on-surface">Arrive 10 Mins Early</h4>
                    <p className="text-[12px] text-on-surface-variant mt-0.5 leading-snug">Arrive min. 10 minutes before your booking time.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="text-[20px] shrink-0">🚭</span>
                  <div>
                    <h4 className="font-bold text-[13px] text-on-surface">No Smoking</h4>
                    <p className="text-[12px] text-on-surface-variant mt-0.5 leading-snug">Strictly non-smoking facility inside the playing and dining zones.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="text-[20px] shrink-0">📹</span>
                  <div>
                    <h4 className="font-bold text-[13px] text-on-surface">CCTV Security</h4>
                    <p className="text-[12px] text-on-surface-variant mt-0.5 leading-snug">The entire premise is monitored continuously for play safety.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="text-[20px] shrink-0">☔</span>
                  <div>
                    <h4 className="font-bold text-[13px] text-on-surface">Rain & Weather Policy</h4>
                    <p className="text-[12px] text-on-surface-variant mt-0.5 leading-snug">Matches can be rescheduled if rain halts play. Not liable for injuries.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Booking Policies */}
            <div className="bg-surface-container-lowest p-5 rounded-[24px] border border-outline-variant/65 shadow-[0_4px_16px_rgba(0,52,43,0.06)] flex flex-col justify-between gap-4">
              <div>
                <h3 className="font-bold text-[18px] text-on-background pb-1 border-b-2 border-primary/10 mb-3">Booking Policies</h3>
                
                <div className="mb-3">
                  <h4 className="font-bold text-[13px] text-on-surface mb-1">Cancellation</h4>
                  <ul className="list-disc pl-4 flex flex-col gap-1 text-[12px] text-on-surface-variant">
                    <li><strong className="text-on-surface">100% Refundable:</strong> Cancel 24+ hours before the slot.</li>
                    <li><strong className="text-on-surface">Non-Refundable:</strong> Cancel less than 24 hours from slot.</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-[13px] text-on-surface mb-1">Rescheduling</h4>
                  <ul className="list-disc pl-4 flex flex-col gap-1 text-[12px] text-on-surface-variant">
                    <li><strong className="text-on-surface">Flexi-Reschedule:</strong> Move slots before start time.</li>
                    <li>Adjusted easily according to target slot pricing differences.</li>
                  </ul>
                </div>
              </div>

              <div className="bg-surface-container-low p-3.5 rounded-xl text-center">
                <span className="font-semibold text-[12px] text-on-surface flex items-center justify-center gap-1.5 leading-snug">
                  <span>🛍</span> Easily cancel or reschedule bookings directly inside the PlayHub app.
                </span>
              </div>
            </div>
          </section>
        )}

        {/* Location & Directions */}
        {hasLocation(venue) && (
          <section className="mb-6">
            <h2 className="font-semibold text-[20px] text-on-background mb-4">Location</h2>
            <div className="rounded-2xl overflow-hidden border border-outline-variant/65 bg-surface-container-low shadow-sm">
              <iframe
                title={`Map of ${venue.name}`}
                src={getMapEmbedUrl(venue)}
                className="w-full h-[200px] md:h-[260px] border-0 block"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
              <div className="flex items-center gap-3 p-4">
                <span className="material-symbols-outlined text-primary text-[22px] shrink-0">location_on</span>
                <p className="text-[13px] text-on-surface-variant flex-1 min-w-0 leading-snug">{venue.address}</p>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => openExternal(getDirectionsUrl(venue))}
                  className="bg-primary text-on-primary px-4 py-2.5 rounded-full font-semibold text-[13px] flex items-center gap-1.5 cursor-pointer hover:opacity-90 transition-opacity shrink-0"
                >
                  <span className="material-symbols-outlined text-[16px]">directions</span>
                  Get Directions
                </motion.button>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Floating Action Bar */}
      <div className="fixed bottom-0 w-full bg-surface-container-lowest pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] px-5 z-50 shadow-[0_-8px_24px_rgba(0,52,43,0.15)] rounded-t-2xl border-t border-outline-variant/65">
        <div className="flex justify-between items-center max-w-md mx-auto">
          <div className="flex flex-col">
            <span className="font-medium text-[12px] text-on-surface-variant">Total Price</span>
            <div className="flex items-baseline gap-1">
              <span className="font-bold text-[30px] text-primary">₹{venue.price}</span>
              <span className="text-[14px] text-on-surface-variant">onwards</span>
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

      {/* Dynamic Island style Toast */}
      <Toast message={toastMsg} icon={toastIcon} />
    </motion.div>
  );
}
