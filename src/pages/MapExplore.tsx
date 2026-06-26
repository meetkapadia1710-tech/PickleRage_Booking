import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import type { Venue } from '../types';
import { logger } from '../lib/logger';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import SmartImage from '../components/SmartImage';
import { sanitizeVenue } from '../lib/venues';

// Create a custom modern map pin using Leaflet divIcon
const createCustomIcon = (active: boolean) => L.divIcon({
  className: 'custom-map-marker',
  html: `
    <div style="
      background-color: ${active ? '#FFC107' : '#004d40'};
      color: ${active ? '#00342b' : '#ffffff'};
      width: 40px; height: 40px;
      display: flex; align-items: center; justify-content: center;
      border-radius: 50%;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      border: 2px solid white;
      transition: all 0.2s ease;
      transform: ${active ? 'scale(1.1)' : 'scale(1)'};
    ">
      <span class="material-symbols-outlined" style="font-size: 20px; font-variation-settings: 'FILL' 1;">location_on</span>
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

// A component to automatically re-center the map when a venue is selected
function RecenterAutomatically({ lat, lng }: { lat: number, lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 14, {
      animate: true,
      duration: 0.5
    });
  }, [lat, lng, map]);
  return null;
}

export default function MapExplore() {
  const navigate = useNavigate();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);

  useEffect(() => {
    let cancelled = false;
    getDocs(collection(db, 'venues'))
      .then(snap => {
        if (cancelled) return;
        const fetched = snap.docs.map(d => {
          const data = d.data() as Venue;
          const id = d.id;
          return sanitizeVenue({ ...data, id });
        }).filter(v => typeof v.lat === 'number' && typeof v.lng === 'number');
        
        setVenues(fetched);
        setLoading(false);
      })
      .catch(err => {
        if (cancelled) return;
        logger.error('MapExplore: error fetching venues', err);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const defaultCenter: [number, number] = [21.7051, 72.9959]; // Bharuch center

  return (
    <div className="relative w-full h-screen bg-surface-container-lowest overflow-hidden">
      {/* Top Bar Overlay */}
      <div className="absolute top-0 left-0 right-0 z-[1000] p-4 pt-[calc(1rem+env(safe-area-inset-top))] flex items-center justify-center pointer-events-none">
        {/* Unified Header / Search Bar */}
        <div className="pointer-events-auto w-full max-w-md h-[54px] rounded-[27px] bg-surface-container-lowest/95 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-outline-variant/40 flex items-center px-1.5">
          
          <button
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="w-11 h-11 rounded-full flex items-center justify-center text-on-surface hover:bg-surface-variant/50 transition-colors cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
          </button>
          
          <div className="flex-1 flex flex-col justify-center px-2.5 cursor-pointer">
            <span className="font-extrabold text-[15px] leading-tight text-on-background">Explore Bharuch</span>
            <span className="font-medium text-[12.5px] leading-tight text-on-surface-variant flex items-center gap-1">
              Any sport • {venues.length} venues found
            </span>
          </div>

          <button className="w-10 h-10 mr-1.5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 hover:bg-primary/20 transition-colors cursor-pointer">
            <span className="material-symbols-outlined text-[20px]">tune</span>
          </button>
        </div>
      </div>

      {/* Map Container */}
      <div className="absolute inset-0 z-0">
        {!loading && (
          <MapContainer 
            center={defaultCenter} 
            zoom={13} 
            zoomControl={false}
            className="w-full h-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />
            {venues.map(venue => (
              <Marker 
                key={venue.id} 
                position={[venue.lat!, venue.lng!]}
                icon={createCustomIcon(selectedVenue?.id === venue.id)}
                eventHandlers={{
                  click: () => setSelectedVenue(venue),
                }}
              />
            ))}
            {selectedVenue && selectedVenue.lat && selectedVenue.lng && (
              <RecenterAutomatically lat={selectedVenue.lat} lng={selectedVenue.lng} />
            )}
          </MapContainer>
        )}
      </div>

      {/* Venue Preview Card overlay (Bottom) */}
      <div className="absolute bottom-0 left-0 right-0 z-[1000] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pointer-events-none flex justify-center">
        <AnimatePresence>
          {selectedVenue && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="pointer-events-auto w-full max-w-md bg-surface-container-lowest rounded-3xl p-3 shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-outline-variant/30 flex gap-3 cursor-pointer"
              onClick={() => navigate(`/venue/${selectedVenue.id}`)}
            >
              <div className="w-24 h-24 shrink-0 rounded-2xl overflow-hidden bg-surface-container-high">
                <SmartImage src={selectedVenue.images?.[0]} alt={selectedVenue.name} />
              </div>
              <div className="flex flex-col justify-center flex-1 py-1">
                <h3 className="font-bold text-[16px] text-on-background leading-tight line-clamp-1 mb-1">
                  {selectedVenue.name}
                </h3>
                <p className="text-[13px] text-on-surface-variant line-clamp-1 mb-2 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">location_on</span>
                  {selectedVenue.address.split(',')[0]}
                </p>
                <div className="flex justify-between items-center mt-auto">
                  <span className="font-bold text-[15px] text-on-surface">
                    ₹{selectedVenue.price}<span className="text-[12px] font-normal text-on-surface-variant">/hr</span>
                  </span>
                  <button className="bg-primary text-on-primary px-4 py-1.5 rounded-full font-bold text-[13px]">
                    Book
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
