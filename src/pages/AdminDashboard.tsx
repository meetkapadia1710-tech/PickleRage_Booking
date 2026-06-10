import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  collection, getDocs, doc, updateDoc, deleteDoc, addDoc,
  query, where, deleteField
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Venue, Court, Booking } from '../types';

// ─── constants ────────────────────────────────────────────────────────────────

const ALL_AMENITIES: { key: string; label: string }[] = [
  { key: 'local_parking', label: 'Parking' },
  { key: 'shower',        label: 'Showers' },
  { key: 'lock',          label: 'Lockers' },
  { key: 'water_drop',    label: 'Water' },
  { key: 'storefront',    label: 'Pro Shop' },
  { key: 'restaurant',    label: 'Cafe' },
  { key: 'wifi',          label: 'Wi-Fi' },
  { key: 'ac_unit',       label: 'AC' },
  { key: 'light_mode',    label: 'Floodlights' },
  { key: 'first_aid_kit', label: 'First Aid' },
];

const BLANK_VENUE: Omit<Venue, 'id'> = {
  name: '',
  type: 'pickleball',
  images: [''],
  price: 600,
  address: '',
  distance: '',
  rating: 4.5,
  amenities: [],
  isPremium: false,
};

const BLANK_COURT: Omit<Court, 'id' | 'venueId'> = {
  name: '',
  surface: '',
  isIndoor: true,
};

// ─── small helpers ────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-medium text-[12px] text-on-surface-variant uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

function TextInput({
  value, onChange, placeholder, type = 'text',
}: {
  value: string | number; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-[44px] px-3 border-[1.5px] border-outline-variant rounded-xl bg-surface-container-lowest text-on-surface text-[15px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors w-full"
    />
  );
}

// ─── Court mini-editor ────────────────────────────────────────────────────────

function CourtEditor({
  court,
  onSave,
  onDelete,
  onCancel,
}: {
  court: Partial<Court>;
  onSave: (c: Partial<Court>) => void;
  onDelete?: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Partial<Court>>(court);
  const set = (key: keyof Court, value: unknown) => setForm(f => ({ ...f, [key]: value }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="bg-surface-container-low rounded-2xl p-4 flex flex-col gap-3"
    >
      <Field label="Court Name">
        <TextInput value={form.name ?? ''} onChange={v => set('name', v)} placeholder="e.g. Court 1" />
      </Field>
      <Field label="Surface">
        <TextInput value={form.surface ?? ''} onChange={v => set('surface', v)} placeholder="e.g. Hard Court, Astro Turf" />
      </Field>
      <Field label="Location">
        <div className="flex gap-2">
          {(['Indoor', 'Outdoor'] as const).map(opt => {
            const val = opt === 'Indoor';
            const active = form.isIndoor === val;
            return (
              <button
                key={opt}
                onClick={() => set('isIndoor', val)}
                className={`flex-1 h-[40px] rounded-xl font-medium text-[14px] border-[1.5px] transition-colors cursor-pointer ${active ? 'border-primary bg-primary/5 text-primary' : 'border-outline-variant text-on-surface-variant hover:border-primary/40'}`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </Field>
      <div className="flex gap-2 pt-1">
        <button onClick={onCancel} className="flex-1 h-[40px] rounded-full border border-outline-variant text-on-surface-variant font-medium text-[14px] hover:bg-surface-container transition-colors cursor-pointer">Cancel</button>
        {onDelete && (
          <button onClick={onDelete} className="h-[40px] px-4 rounded-full border border-error/40 text-error font-medium text-[14px] hover:bg-error-container/20 transition-colors cursor-pointer">Delete</button>
        )}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            if (!form.name?.trim() || !form.surface?.trim()) return;
            onSave(form);
          }}
          className="flex-1 h-[40px] rounded-full bg-primary text-on-primary font-medium text-[14px] hover:opacity-90 transition-opacity cursor-pointer"
        >
          Save
        </motion.button>
      </div>
    </motion.div>
  );
}

// ─── Venue detail editor (full side-panel) ────────────────────────────────────

function VenueEditor({
  venue,
  isNew,
  onClose,
  onSaved,
}: {
  venue: Venue | null;   // null = creating new
  isNew: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Omit<Venue, 'id'>>(
    venue ? { name: venue.name, type: venue.type, images: [...venue.images], price: venue.price,
               address: venue.address, distance: venue.distance, rating: venue.rating,
               amenities: [...venue.amenities], isPremium: venue.isPremium ?? false,
               lat: venue.lat, lng: venue.lng }
          : { ...BLANK_VENUE }
  );

  const [courts, setCourts] = useState<Court[]>([]);
  const [loadingCourts, setLoadingCourts] = useState(!isNew);
  const [editingCourtId, setEditingCourtId] = useState<string | 'new' | null>(null);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm(f => ({ ...f, [key]: value }));

  // Fetch courts for existing venue (loadingCourts already starts false when isNew)
  useEffect(() => {
    if (isNew || !venue) return;
    getDocs(query(collection(db, 'courts'), where('venueId', '==', venue.id)))
      .then(snap => setCourts(snap.docs.map(d => ({ ...d.data(), id: d.id } as Court))))
      .catch(console.error)
      .finally(() => setLoadingCourts(false));
  }, [venue, isNew]);

  const handleSaveVenue = async () => {
    if (!form.name.trim() || !form.address.trim()) {
      setError('Name and Address are required.');
      return;
    }
    setSaving(true); setError('');
    try {
      const clean: Record<string, unknown> = { ...form, images: form.images.filter(u => u.trim()) };
      // Coordinates are only stored as a valid pair; Firestore rejects `undefined` values.
      const hasCoords =
        typeof form.lat === 'number' && !Number.isNaN(form.lat) &&
        typeof form.lng === 'number' && !Number.isNaN(form.lng);
      if (!hasCoords) {
        delete clean.lat;
        delete clean.lng;
      }
      if (isNew) {
        await addDoc(collection(db, 'venues'), clean);
      } else if (venue) {
        if (!hasCoords) {
          // Clearing the fields in the editor removes stale coordinates.
          clean.lat = deleteField();
          clean.lng = deleteField();
        }
        await updateDoc(doc(db, 'venues', venue.id), clean);
      }
      onSaved();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVenue = async () => {
    if (!venue) return;
    setDeleting(true);
    try {
      // Delete courts first
      for (const c of courts) await deleteDoc(doc(db, 'courts', c.id));
      await deleteDoc(doc(db, 'venues', venue.id));
      onSaved();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Delete failed.');
      setDeleting(false);
    }
  };

  // ── courts helpers ────────────────────────────────────────────────────────

  const saveCourt = async (courtData: Partial<Court>, existingId?: string) => {
    if (!venue && isNew) return; // courts require a venue id; handle after venue is saved
    const venueId = venue?.id ?? '';
    if (existingId) {
      await updateDoc(doc(db, 'courts', existingId), courtData as Record<string, unknown>);
      setCourts(cs => cs.map(c => c.id === existingId ? { ...c, ...courtData } : c));
    } else {
      const ref = await addDoc(collection(db, 'courts'), { ...courtData, venueId });
      setCourts(cs => [...cs, { id: ref.id, venueId, ...courtData } as Court]);
    }
    setEditingCourtId(null);
  };

  const deleteCourt = async (courtId: string) => {
    await deleteDoc(doc(db, 'courts', courtId));
    setCourts(cs => cs.filter(c => c.id !== courtId));
    setEditingCourtId(null);
  };

  // ── image list helpers ────────────────────────────────────────────────────

  const setImage = (i: number, val: string) =>
    set('images', form.images.map((img, idx) => idx === i ? val : img));
  const addImage = () => set('images', [...form.images, '']);
  const removeImage = (i: number) => set('images', form.images.filter((_, idx) => idx !== i));

  // ── amenity toggle ────────────────────────────────────────────────────────

  const toggleAmenity = (key: string) =>
    set('amenities', form.amenities.includes(key)
      ? form.amenities.filter(a => a !== key)
      : [...form.amenities, key]);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex justify-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-on-background/30 backdrop-blur-[2px]"
        />

        {/* Panel */}
        <motion.div
          initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 260 }}
          className="relative w-full max-w-xl bg-surface-container-lowest shadow-[-12px_0_40px_rgba(0,52,43,0.15)] flex flex-col h-full"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-variant/50 shrink-0">
            <div>
              <h2 className="font-bold text-[20px] text-on-surface">
                {isNew ? 'Add New Venue' : 'Edit Venue'}
              </h2>
              {!isNew && venue && (
                <p className="text-[13px] text-on-surface-variant truncate max-w-[260px]">{venue.name}</p>
              )}
            </div>
            <motion.button
              whileTap={{ scale: 0.85 }} onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-surface-container hover:bg-surface-variant text-on-surface-variant transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </motion.button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-6">

            {/* ── Basic Info ── */}
            <section>
              <p className="font-semibold text-[13px] text-on-surface-variant uppercase tracking-wider mb-3">Basic Info</p>
              <div className="flex flex-col gap-3">
                <Field label="Venue Name *">
                  <TextInput value={form.name} onChange={v => set('name', v)} placeholder="e.g. PlayHub Pickleball Central" />
                </Field>

                <Field label="Type">
                  <div className="flex gap-2">
                    {(['pickleball', 'box cricket'] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => set('type', t)}
                        className={`flex-1 h-[44px] rounded-xl font-medium text-[14px] border-[1.5px] capitalize transition-colors cursor-pointer ${form.type === t ? 'border-primary bg-primary/5 text-primary' : 'border-outline-variant text-on-surface-variant hover:border-primary/40'}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </Field>

                <Field label="Address *">
                  <TextInput value={form.address} onChange={v => set('address', v)} placeholder="1200 Baseline Road, Downtown District" />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Latitude (optional)">
                    <TextInput
                      value={form.lat ?? ''}
                      onChange={v => set('lat', v.trim() === '' ? undefined : Number(v))}
                      type="number"
                      placeholder="22.3072"
                    />
                  </Field>
                  <Field label="Longitude (optional)">
                    <TextInput
                      value={form.lng ?? ''}
                      onChange={v => set('lng', v.trim() === '' ? undefined : Number(v))}
                      type="number"
                      placeholder="73.1812"
                    />
                  </Field>
                </div>
                <p className="text-[12px] text-on-surface-variant -mt-1">
                  Powers the venue map &amp; directions. Leave blank to locate by address.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Distance">
                    <TextInput value={form.distance} onChange={v => set('distance', v)} placeholder="e.g. 1.2 mi" />
                  </Field>
                  <Field label="Price / hr (₹)">
                    <TextInput value={form.price} onChange={v => set('price', Number(v))} type="number" placeholder="600" />
                  </Field>
                </div>
              </div>
            </section>

            {/* ── Images ── */}
            <section>
              <p className="font-semibold text-[13px] text-on-surface-variant uppercase tracking-wider mb-3">Images</p>
              <div className="flex flex-col gap-2">
                {form.images.map((url, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <div className="flex-1 flex flex-col gap-1.5">
                      <TextInput
                        value={url}
                        onChange={v => setImage(i, v)}
                        placeholder={`Image URL ${i + 1}`}
                      />
                      {url.trim() && (
                        <div className="h-24 rounded-xl overflow-hidden bg-surface-variant">
                          <img
                            src={url}
                            alt={`preview ${i + 1}`}
                            className="w-full h-full object-cover"
                            onError={e => (e.currentTarget.style.display = 'none')}
                          />
                        </div>
                      )}
                    </div>
                    {form.images.length > 1 && (
                      <button
                        onClick={() => removeImage(i)}
                        className="mt-1.5 w-9 h-9 flex items-center justify-center rounded-full text-error hover:bg-error-container/20 transition-colors cursor-pointer shrink-0"
                      >
                        <span className="material-symbols-outlined text-[18px]">remove_circle</span>
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={addImage}
                  className="h-[40px] rounded-xl border-[1.5px] border-dashed border-outline-variant text-on-surface-variant font-medium text-[14px] flex items-center justify-center gap-2 hover:border-primary hover:text-primary transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">add_photo_alternate</span>
                  Add Image URL
                </button>
              </div>
            </section>

            {/* ── Amenities ── */}
            <section>
              <p className="font-semibold text-[13px] text-on-surface-variant uppercase tracking-wider mb-3">Amenities</p>
              <div className="flex flex-wrap gap-2">
                {ALL_AMENITIES.map(a => {
                  const active = form.amenities.includes(a.key);
                  return (
                    <button
                      key={a.key}
                      onClick={() => toggleAmenity(a.key)}
                      className={`h-[36px] px-3 rounded-full border-[1.5px] font-medium text-[13px] flex items-center gap-1.5 transition-colors cursor-pointer ${active ? 'border-primary bg-primary/5 text-primary' : 'border-outline-variant text-on-surface-variant hover:border-primary/40'}`}
                    >
                      <span className="material-symbols-outlined text-[16px]">{a.key}</span>
                      {a.label}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* ── Courts ── (only for existing venues) */}
            {!isNew && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold text-[13px] text-on-surface-variant uppercase tracking-wider">Courts</p>
                  {editingCourtId !== 'new' && (
                    <button
                      onClick={() => setEditingCourtId('new')}
                      className="h-[30px] px-3 rounded-full bg-primary text-on-primary font-medium text-[12px] flex items-center gap-1 hover:opacity-90 transition-opacity cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">add</span>
                      Add Court
                    </button>
                  )}
                </div>

                {loadingCourts ? (
                  <div className="flex justify-center py-4">
                    <span className="material-symbols-outlined animate-spin text-primary">sync</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {editingCourtId === 'new' && (
                      <CourtEditor
                        court={{ ...BLANK_COURT }}
                        onSave={data => saveCourt(data)}
                        onCancel={() => setEditingCourtId(null)}
                      />
                    )}
                    {courts.map(court => (
                      editingCourtId === court.id ? (
                        <CourtEditor
                          key={court.id}
                          court={court}
                          onSave={data => saveCourt(data, court.id)}
                          onDelete={() => deleteCourt(court.id)}
                          onCancel={() => setEditingCourtId(null)}
                        />
                      ) : (
                        <motion.div
                          key={court.id}
                          layout
                          className="flex items-center gap-3 bg-surface-container-low rounded-2xl px-4 py-3"
                        >
                          <span className="material-symbols-outlined text-primary text-[20px]">
                            {form.type === 'pickleball' ? 'sports_tennis' : 'sports_cricket'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-[14px] text-on-surface">{court.name}</p>
                            <p className="text-[13px] text-on-surface-variant">{court.surface} · {court.isIndoor ? 'Indoor' : 'Outdoor'}</p>
                          </div>
                          <button
                            onClick={() => setEditingCourtId(court.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-full text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                        </motion.div>
                      )
                    ))}
                    {courts.length === 0 && editingCourtId !== 'new' && (
                      <p className="text-[14px] text-on-surface-variant text-center py-3">No courts yet — add one above.</p>
                    )}
                  </div>
                )}
              </section>
            )}

            {/* ── Delete venue ── */}
            {!isNew && (
              <section className="border-t border-error/20 pt-4">
                <p className="font-semibold text-[13px] text-on-surface-variant uppercase tracking-wider mb-3">Danger Zone</p>
                {confirmDelete ? (
                  <div className="bg-error-container/30 border border-error/30 rounded-2xl p-4 flex flex-col gap-3">
                    <p className="text-[14px] text-on-error-container font-medium">This will permanently delete the venue and all its courts. This cannot be undone.</p>
                    <div className="flex gap-2">
                      <button onClick={() => setConfirmDelete(false)} className="flex-1 h-[40px] rounded-full border border-outline-variant text-on-surface font-medium text-[14px] cursor-pointer hover:bg-surface-container transition-colors">Cancel</button>
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={handleDeleteVenue}
                        disabled={deleting}
                        className="flex-1 h-[40px] rounded-full bg-error text-on-error font-medium text-[14px] flex items-center justify-center gap-1 hover:opacity-90 cursor-pointer disabled:opacity-60"
                      >
                        {deleting ? <span className="material-symbols-outlined animate-spin text-[16px]">sync</span> : null}
                        {deleting ? 'Deleting…' : 'Delete Venue'}
                      </motion.button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="h-[44px] w-full rounded-xl border-[1.5px] border-error/40 text-error font-medium text-[14px] flex items-center justify-center gap-2 hover:bg-error-container/20 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                    Delete This Venue
                  </button>
                )}
              </section>
            )}

            {error && (
              <p className="text-[13px] text-error bg-error-container/20 px-4 py-3 rounded-xl">{error}</p>
            )}
          </div>

          {/* Footer — save */}
          <div className="px-5 py-4 border-t border-surface-variant/50 shrink-0 bg-surface-container-lowest">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSaveVenue}
              disabled={saving}
              className="w-full h-[52px] rounded-full bg-primary text-on-primary font-semibold text-[16px] flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60 cursor-pointer"
            >
              {saving
                ? <><motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }} className="material-symbols-outlined">sync</motion.span> Saving…</>
                : <><span className="material-symbols-outlined">save</span> {isNew ? 'Create Venue' : 'Save Changes'}</>
              }
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'bookings' | 'venues'>('bookings');

  const [venues, setVenues] = useState<Venue[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingVenue, setEditingVenue] = useState<Venue | null | 'new'>(null);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getDocs(collection(db, 'venues')),
      getDocs(collection(db, 'bookings')),
    ])
      .then(([venuesSnap, bookingsSnap]) => {
        if (cancelled) return;
        setVenues(venuesSnap.docs.map(d => ({ ...d.data(), id: d.id } as Venue)));
        setBookings(bookingsSnap.docs.map(d => ({ ...d.data(), id: d.id } as Booking)));
        setLoading(false);
      })
      .catch(err => {
        if (cancelled) return;
        console.error('Admin data fetch error:', err);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [reloadKey]);

  const refreshData = () => {
    setLoading(true);
    setReloadKey(k => k + 1);
  };

  const totalBookings = bookings.length;
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length;
  const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length;

  const navItems: { id: 'bookings' | 'venues'; icon: string; label: string }[] = [
    { id: 'bookings', icon: 'calendar_today', label: 'Bookings' },
    { id: 'venues',   icon: 'stadium',        label: 'Venues' },
  ];

  return (
    <div className="bg-surface text-on-surface min-h-screen flex flex-col md:flex-row antialiased">

      {/* ── Sidebar (desktop) ── */}
      <aside className="hidden md:flex flex-col w-64 bg-surface-container-lowest border-r border-surface-variant shrink-0">
        <div className="flex items-center gap-2 text-primary px-5 py-6">
          <span className="material-symbols-outlined text-[26px]">sports_tennis</span>
          <span className="font-bold text-[22px]">PlayHub Admin</span>
        </div>
        <nav className="flex flex-col gap-1 px-3">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors cursor-pointer text-left ${activeTab === item.id ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant hover:bg-surface-container'}`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="mt-auto px-3 pb-6">
          <button onClick={() => navigate('/home')} className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-on-surface-variant hover:bg-surface-container transition-colors w-full cursor-pointer">
            <span className="material-symbols-outlined">exit_to_app</span>
            Exit Admin
          </button>
        </div>
      </aside>

      {/* ── Mobile header ── */}
      <header className="md:hidden bg-surface-container-lowest border-b border-surface-variant px-4 pt-[calc(12px+env(safe-area-inset-top))] pb-3 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2 text-primary">
          <span className="material-symbols-outlined text-[22px]">sports_tennis</span>
          <span className="font-bold text-[18px]">PlayHub Admin</span>
        </div>
        <button onClick={() => navigate('/home')} className="w-9 h-9 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer">
          <span className="material-symbols-outlined">close</span>
        </button>
      </header>

      {/* ── Main content ── */}
      <main className="flex-1 p-5 md:p-8 overflow-y-auto">

        {/* Mobile tabs */}
        <div className="md:hidden flex gap-2 mb-6">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`px-4 py-2 rounded-full font-medium text-[14px] whitespace-nowrap cursor-pointer transition-colors ${activeTab === item.id ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'}`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">

          {/* ── Bookings tab ── */}
          {activeTab === 'bookings' && (
            <motion.div key="bookings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <h1 className="font-bold text-[28px] text-on-background mb-6">Manage Bookings</h1>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                {[
                  { label: 'Total', value: totalBookings, color: 'text-primary' },
                  { label: 'Confirmed', value: confirmedBookings, color: 'text-secondary' },
                  { label: 'Cancelled', value: cancelledBookings, color: 'text-error' },
                ].map(stat => (
                  <div key={stat.label} className="bg-surface-container-lowest p-5 rounded-xl border border-surface-variant shadow-sm">
                    <p className="text-[13px] text-on-surface-variant font-medium mb-1">{stat.label}</p>
                    <p className={`text-[32px] font-bold ${stat.color}`}>{loading ? '—' : stat.value}</p>
                  </div>
                ))}
              </div>

              {loading ? (
                <div className="flex justify-center py-12"><span className="material-symbols-outlined animate-spin text-[36px] text-primary">sync</span></div>
              ) : bookings.length === 0 ? (
                <div className="bg-surface-container-lowest rounded-xl border border-surface-variant p-8 text-center text-on-surface-variant">No bookings found.</div>
              ) : (
                <div className="bg-surface-container-lowest rounded-xl border border-surface-variant shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-surface-container-low border-b border-surface-variant text-[13px] text-on-surface-variant">
                          <th className="p-4 font-semibold">Booking ID</th>
                          <th className="p-4 font-semibold">Date</th>
                          <th className="p-4 font-semibold">Time</th>
                          <th className="p-4 font-semibold">Venue</th>
                          <th className="p-4 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bookings.map(b => {
                          const venueName = venues.find(v => v.id === b.venueId)?.name ?? b.venueId;
                          return (
                            <tr key={b.id} className="border-b border-surface-variant/50 hover:bg-surface-container-low/60 text-[14px] transition-colors">
                              <td className="p-4 font-mono text-[13px] text-on-surface-variant">{b.id.slice(0, 10)}…</td>
                              <td className="p-4">{b.date}</td>
                              <td className="p-4 whitespace-nowrap">{b.startTime} – {b.endTime}</td>
                              <td className="p-4 max-w-[180px] truncate">{venueName}</td>
                              <td className="p-4">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full font-medium text-[12px] capitalize ${b.status === 'confirmed' ? 'bg-secondary/10 text-secondary' : 'bg-error/10 text-error'}`}>
                                  {b.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ── Venues tab ── */}
          {activeTab === 'venues' && (
            <motion.div key="venues" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="flex justify-between items-center mb-6 gap-4">
                <h1 className="font-bold text-[28px] text-on-background">Manage Venues</h1>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setEditingVenue('new')}
                  className="bg-primary text-on-primary px-4 py-2.5 rounded-full font-semibold text-[14px] flex items-center gap-2 hover:opacity-90 transition-opacity cursor-pointer shrink-0"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  Add Venue
                </motion.button>
              </div>

              {loading ? (
                <div className="flex justify-center py-12"><span className="material-symbols-outlined animate-spin text-[36px] text-primary">sync</span></div>
              ) : venues.length === 0 ? (
                <div className="bg-surface-container-lowest rounded-xl border border-dashed border-outline-variant p-12 text-center flex flex-col items-center gap-3">
                  <span className="material-symbols-outlined text-[48px] text-outline">stadium</span>
                  <p className="text-on-surface-variant font-medium">No venues yet.</p>
                  <button onClick={() => setEditingVenue('new')} className="mt-1 px-5 py-2.5 rounded-full bg-primary text-on-primary font-semibold text-[14px] cursor-pointer hover:opacity-90">Add your first venue</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {venues.map(venue => (
                    <motion.div
                      key={venue.id}
                      whileHover={{ y: -3 }}
                      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                      className="bg-surface-container-lowest rounded-2xl border border-surface-variant overflow-hidden shadow-sm flex flex-col"
                    >
                      <div className="h-36 bg-surface-variant relative">
                        {venue.images?.[0] ? (
                          <img src={venue.images[0]} alt={venue.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-outline">
                            <span className="material-symbols-outlined text-[40px]">image_not_supported</span>
                          </div>
                        )}
                        <div className="absolute top-2 left-2 bg-background/90 backdrop-blur-sm px-2.5 py-0.5 rounded-full text-[12px] font-semibold capitalize text-on-surface">
                          {venue.type}
                        </div>
                      </div>
                      <div className="p-4 flex-1 flex flex-col gap-1">
                        <h3 className="font-bold text-[16px] text-on-surface leading-tight">{venue.name}</h3>
                        <p className="text-[13px] text-on-surface-variant line-clamp-1">{venue.address}</p>
                        {venue.distance && (
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[13px] text-on-surface-variant">{venue.distance}</span>
                          </div>
                        )}
                      </div>
                      <div className="px-4 pb-4 flex items-center justify-between border-t border-surface-variant/50 pt-3">
                        <span className="font-bold text-[16px] text-primary">₹{venue.price}<span className="font-normal text-[13px] text-on-surface-variant">/hr</span></span>
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setEditingVenue(venue)}
                          className="h-[36px] px-4 rounded-full bg-primary text-on-primary font-semibold text-[13px] flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                          Edit
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ── Venue Editor panel ── */}
      <AnimatePresence>
        {editingVenue !== null && (
          <VenueEditor
            venue={editingVenue === 'new' ? null : editingVenue}
            isNew={editingVenue === 'new'}
            onClose={() => setEditingVenue(null)}
            onSaved={() => { setEditingVenue(null); refreshData(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
