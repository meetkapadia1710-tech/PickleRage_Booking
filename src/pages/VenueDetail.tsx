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

        <div className="fixed top-0 left-0 right-0 max-w-3xl md:max-w-5xl lg:max-w-6xl xl:max-w-7xl mx-auto w-full flex justify-between items-center px-5 pt-[calc(1.5rem+env(safe-area-inset-top))] h-auto z-50">
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
      <main className="relative z-20 -mt-10 bg-background rounded-t-[32px] px-5 pt-8 min-h-[442px] shadow-[0_-8px_24px_rgba(0,52,43,0.08)] max-w-3xl md:max-w-5xl lg:max-w-6xl xl:max-w-7xl mx-auto w-full animate-fadeIn">
        {/* Title & Location Info */}
        <header className="mb-6">
          <h1 className="font-extrabold text-[28px] lg:text-[32px] leading-tight text-on-background mb-1.5 tracking-tight">{venue.name}</h1>
          {/* Rating + Hours row */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px] text-amber-500" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
              <span className="font-bold text-[13px] text-on-surface">{venue.rating}</span>
              {venue.ratingCount && (
                <span className="text-[12px] text-on-surface-variant">({venue.ratingCount} ratings)</span>
              )}
            </div>
            {venue.openHours && (
              <>
                <span className="text-on-surface-variant text-[12px]">•</span>
                <span className="text-[12px] text-on-surface-variant font-medium">{venue.openHours}</span>
              </>
            )}
          </div>
          <div className="flex justify-between items-start gap-4">
            <div className="flex items-start gap-1.5 text-on-surface-variant flex-1 min-w-0">
              <span className="material-symbols-outlined text-primary text-[18px] shrink-0 mt-0.5">location_on</span>
              <span className="text-[13px] leading-snug">{venue.address}</span>
            </div>
            <button
              onClick={() => {
                const reviewUrls: Record<string, string> = {
                  venue_1: 'https://maps.app.goo.gl/vyqx9GV1a1Qt8Ua47',
                  venue_3: 'https://maps.app.goo.gl/hJXz5AXDQkpCL5Uj8',
                };
                const targetUrl = reviewUrls[venue.id] || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venue.name} ${venue.address}`)}`;
                openExternal(targetUrl);
              }}
              className="bg-secondary-container/20 hover:bg-secondary-container/30 border border-secondary-container/30 px-3 py-1 rounded-full flex items-center gap-1 text-[11px] font-bold text-on-secondary-container transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
            >
              <span className="material-symbols-outlined text-[11px] text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
              Rate on Google
            </button>
          </div>
        </header>

        <div className="h-px w-full bg-surface-variant mb-6"></div>

        {/* 2-Column Split Dashboard Layout for Desktop */}
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start w-full pb-16">
          
          {/* Left Column: Courts & Location Map */}
          <div className="w-full lg:flex-1 flex flex-col gap-6">
            {/* Court Type Selector */}
            <section>
              <h2 className="font-extrabold text-[20px] text-on-background mb-4 tracking-tight">Select a court to book</h2>
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
                            img: '/court-a.jpg',
                          }
                        : {
                            badge: 'Court B',
                            img: '/court-b.jpg',
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
                          <img src={courtDetails.img} alt={courtDetails.badge} className="absolute inset-0 w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-black/10 z-10" />

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
                            ? 'border-2 border-primary bg-primary/5 shadow-sm' 
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
                        <h3 className="font-bold text-[15px] text-on-background mb-1">{court.name}</h3>
                        <p className="text-[13px] text-on-surface-variant font-medium">{court.surface}</p>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Location & Directions */}
            {hasLocation(venue) && (
              <section>
                <h2 className="font-extrabold text-[20px] text-on-background mb-4 tracking-tight">Location Details</h2>
                <div className="rounded-[24px] overflow-hidden border border-outline-variant/65 bg-surface-container-low shadow-sm">
                  <div className="relative w-full h-[200px] md:h-[260px] overflow-hidden">
                    <iframe
                      title={`Map of ${venue.name}`}
                      src={getMapEmbedUrl(venue)}
                      className="absolute -top-[55px] -left-[80px] w-[calc(100%+160px)] h-[calc(100%+95px)] border-0 block"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      allowFullScreen
                    />
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-surface-container-lowest border-t border-outline-variant/30">
                    <span className="material-symbols-outlined text-primary text-[22px] shrink-0">location_on</span>
                    <p className="text-[13px] text-on-surface-variant flex-1 min-w-0 leading-snug font-medium">{venue.address}</p>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        const customLinks: Record<string, string> = {
                          venue_1: 'https://maps.app.goo.gl/vyqx9GV1a1Qt8Ua47',
                          venue_3: 'https://maps.app.goo.gl/hJXz5AXDQkpCL5Uj8',
                        };
                        const targetUrl = customLinks[venue.id] || getDirectionsUrl(venue);
                        openExternal(targetUrl);
                      }}
                      className="bg-primary text-on-primary px-4 py-2.5 rounded-full font-bold text-[13px] flex items-center gap-1.5 cursor-pointer hover:opacity-90 transition-opacity shrink-0 shadow-[0_4px_12px_rgba(0,82,68,0.15)]"
                    >
                      <span className="material-symbols-outlined text-[16px]">directions</span>
                      Get Directions
                    </motion.button>
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* Right Column: Checkout Card & Venue Info */}
          <aside className="w-full lg:w-[380px] shrink-0 sticky lg:top-24 flex flex-col gap-5 self-start">
            
            {/* Desktop-only Checkout Widget Card */}
            <div className="hidden lg:flex flex-col bg-surface-container-lowest border border-outline-variant/65 p-6 rounded-3xl shadow-[0_8px_30px_rgba(0,52,43,0.04)] gap-4">
              <div className="flex flex-col">
                <span className="font-bold text-[12px] uppercase tracking-wider text-on-surface-variant">Pricing Details</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="font-extrabold text-[32px] text-primary">₹{venue.price}</span>
                  <span className="text-[13px] text-on-surface-variant font-semibold">/ hour onwards</span>
                </div>
              </div>

              <hr className="border-outline-variant/20" />

              {/* Court Selection Status */}
              <div className="flex flex-col gap-2">
                <span className="font-bold text-[12px] uppercase tracking-wider text-on-surface-variant">Selected Court</span>
                {selectedCourt ? (
                  <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-2xl p-4">
                    <span className="material-symbols-outlined text-[24px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>sports_tennis</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[14px] text-on-surface truncate">
                        {courts.find(c => c.id === selectedCourt)?.name || 'Court Selected'}
                      </p>
                      <p className="text-[12px] text-on-surface-variant">
                        {courts.find(c => c.id === selectedCourt)?.surface || 'Standard Surface'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 bg-surface-container-low/40 border border-outline-variant/30 rounded-2xl p-4 border-dashed">
                    <span className="material-symbols-outlined text-[24px] text-on-surface-variant">info</span>
                    <p className="text-[12px] text-on-surface-variant font-medium">Select a court option to unlock scheduling.</p>
                  </div>
                )}
              </div>

              <motion.button
                whileHover={{ scale: selectedCourt ? 1.02 : 1 }}
                whileTap={{ scale: selectedCourt ? 0.98 : 1 }}
                disabled={!selectedCourt}
                onClick={() => {
                  if (selectedCourt) {
                    navigate(`/venue/${venue.id}/court/${selectedCourt}/book`);
                  }
                }}
                className="w-full bg-primary disabled:bg-surface-container-high text-on-primary disabled:text-on-surface-variant font-extrabold text-[15px] py-3.5 rounded-2xl hover:opacity-95 transition-all shadow-[0_4px_12px_rgba(0,82,68,0.2)] disabled:shadow-none flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <span>Book Court Now</span>
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </motion.button>
            </div>

            {/* Highlights, Rules & Policies (stacked below checkout card) */}
            {venue.type === 'pickleball' && (
              <div className="flex flex-col gap-5 w-full">
                {/* Highlights */}
                <div className="bg-surface-container-lowest p-5 rounded-[24px] border border-outline-variant/65 shadow-[0_4px_16px_rgba(0,52,43,0.06)] flex flex-col gap-4">
                  <h3 className="font-bold text-[17px] text-on-background pb-1 border-b-2 border-primary/10">Highlights</h3>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-surface-container-low px-3 py-2 rounded-xl text-center">
                      <span className="block text-[10px] uppercase tracking-wider text-on-surface-variant font-medium">Hours</span>
                      <span className="font-bold text-[12px] text-on-surface">{venue.openHours ?? '6 AM – 12 AM'}</span>
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
                        <span key={h} className="font-bold text-[11px] text-primary flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                          {h}
                        </span>
                      ))}
                    </div>
                  )}
                  <ul className="flex flex-col gap-2.5 text-[13px] text-on-surface-variant font-medium">
                    <li className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-primary font-bold">check</span>
                      <span>Floodlit Courts (LED Floodlights)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-primary font-bold">check</span>
                      <span>Online Booking & Confirmation</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-primary font-bold">check</span>
                      <span>Amenities: Water, Parking, Aid</span>
                    </li>
                  </ul>
                  {/* Offers */}
                  {venue.offers && venue.offers.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <h4 className="font-bold text-[13px] text-on-surface">Active Offers</h4>
                      {venue.offers.map(offer => (
                        <div key={offer.label} className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/40 px-3 py-2.5 rounded-xl flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[14px]">🏷️</span>
                            <span className="font-bold text-[12px] text-green-700 dark:text-green-400">{offer.label}</span>
                          </div>
                          <span className="text-[11px] font-bold text-green-600 dark:text-green-500 underline cursor-pointer">{offer.couponCode || 'Details'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Venue Rules */}
                <div className="bg-surface-container-lowest p-5 rounded-[24px] border border-outline-variant/65 shadow-[0_4px_16px_rgba(0,52,43,0.06)] flex flex-col gap-4">
                  <h3 className="font-bold text-[17px] text-on-background pb-1 border-b-2 border-primary/10">Venue Rules</h3>
                  <div className="flex flex-col gap-4">
                    <div className="flex gap-3">
                      <span className="text-[18px] shrink-0">⏰</span>
                      <div>
                        <h4 className="font-bold text-[13px] text-on-surface">Arrive 10 Mins Early</h4>
                        <p className="text-[12px] text-on-surface-variant mt-0.5 leading-snug">Report to venue 10 minutes prior to slot.</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <span className="text-[18px] shrink-0">🚭</span>
                      <div>
                        <h4 className="font-bold text-[13px] text-on-surface">No Smoking</h4>
                        <p className="text-[12px] text-on-surface-variant mt-0.5 leading-snug">Strictly non-smoking zone inside playing arena.</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <span className="text-[18px] shrink-0">☔</span>
                      <div>
                        <h4 className="font-bold text-[13px] text-on-surface">Weather Rescheduling</h4>
                        <p className="text-[12px] text-on-surface-variant mt-0.5 leading-snug">Reschedule if slots are cancelled due to rain.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Booking Policies */}
                <div className="bg-surface-container-lowest p-5 rounded-[24px] border border-outline-variant/65 shadow-[0_4px_16px_rgba(0,52,43,0.06)] flex flex-col gap-4">
                  <h3 className="font-bold text-[17px] text-on-background pb-1 border-b-2 border-primary/10">Policies</h3>
                  <div className="flex flex-col gap-3">
                    <div>
                      <h4 className="font-bold text-[13px] text-on-surface mb-1">Cancellation</h4>
                      <ul className="list-disc pl-4 flex flex-col gap-1 text-[12px] text-on-surface-variant font-medium">
                        <li><strong className="text-on-surface">24h+ early:</strong> 100% Refundable.</li>
                        <li><strong className="text-on-surface">&lt;24h:</strong> Non-Refundable cancel.</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-bold text-[13px] text-on-surface mb-1">Rescheduling</h4>
                      <ul className="list-disc pl-4 flex flex-col gap-1 text-[12px] text-on-surface-variant font-medium">
                        <li>Allowed easily up to court slot start time.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>
      </main>

      {/* Floating Action Bar (Hidden on desktop) */}
      <div className="fixed bottom-0 w-full bg-surface-container-lowest pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] px-5 z-50 shadow-[0_-8px_24px_rgba(0,52,43,0.15)] rounded-t-2xl border-t border-outline-variant/65 lg:hidden">
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
