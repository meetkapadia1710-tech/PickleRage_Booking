import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  collection, getDocs, doc, updateDoc, deleteDoc, addDoc,
  query, where, deleteField,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useAndroidBackClose } from '../../lib/backClose';
import { logger } from '../../lib/logger';
import type { Venue, Court } from '../../types';
import CourtEditor from './CourtEditor';
import { ALL_AMENITIES, BLANK_COURT, BLANK_VENUE, Field, TextInput } from './adminShared';

export default function VenueEditor({
  venue,
  isNew,
  onClose,
  onSaved,
}: {
  venue: Venue | null; // null = creating new
  isNew: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  // Mounted = open; Android back closes the editor instead of leaving /admin
  useAndroidBackClose(true, onClose);

  const [form, setForm] = useState<Omit<Venue, 'id'>>(
    venue
      ? {
          name: venue.name,
          type: venue.type,
          images: [...venue.images],
          price: venue.price,
          address: venue.address,
          distance: venue.distance,
          rating: venue.rating,
          amenities: [...venue.amenities],
          isPremium: venue.isPremium ?? false,
          lat: venue.lat,
          lng: venue.lng,
        }
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

  // Fetch courts for existing venue
  useEffect(() => {
    if (isNew || !venue) return;
    getDocs(query(collection(db, 'courts'), where('venueId', '==', venue.id)))
      .then(snap => setCourts(snap.docs.map(d => ({ ...d.data(), id: d.id } as Court))))
      .catch(err => logger.error('VenueEditor: failed to load courts', err))
      .finally(() => setLoadingCourts(false));
  }, [venue, isNew]);

  const handleSaveVenue = async () => {
    if (!form.name.trim() || !form.address.trim()) {
      setError('Name and Address are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const clean: Record<string, unknown> = { ...form, images: form.images.filter(u => u.trim()) };
      const hasCoords =
        typeof form.lat === 'number' && !Number.isNaN(form.lat) &&
        typeof form.lng === 'number' && !Number.isNaN(form.lng);
      if (!hasCoords) delete clean.lat;
      if (!hasCoords) delete clean.lng;

      if (isNew) {
        await addDoc(collection(db, 'venues'), clean);
      } else if (venue) {
        if (!hasCoords) {
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
      for (const c of courts) await deleteDoc(doc(db, 'courts', c.id));
      await deleteDoc(doc(db, 'venues', venue.id));
      onSaved();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Delete failed.');
      setDeleting(false);
    }
  };

  // ── Court helpers ─────────────────────────────────────────────────────────

  const saveCourt = async (courtData: Partial<Court>, existingId?: string) => {
    if (!venue && isNew) return;
    const venueId = venue?.id ?? '';
    if (existingId) {
      await updateDoc(doc(db, 'courts', existingId), courtData as Record<string, unknown>);
      setCourts(cs => cs.map(c => (c.id === existingId ? { ...c, ...courtData } : c)));
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

  // ── Image helpers ─────────────────────────────────────────────────────────

  const setImage = (i: number, val: string) =>
    set('images', form.images.map((img, idx) => (idx === i ? val : img)));
  const addImage = () => set('images', [...form.images, '']);
  const removeImage = (i: number) => set('images', form.images.filter((_, idx) => idx !== i));

  const toggleAmenity = (key: string) =>
    set(
      'amenities',
      form.amenities.includes(key)
        ? form.amenities.filter(a => a !== key)
        : [...form.amenities, key]
    );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex justify-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-on-background/30 backdrop-blur-[2px]"
        />

        {/* Panel */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 260 }}
          role="dialog"
          aria-modal="true"
          aria-label={isNew ? 'Add New Venue' : 'Edit Venue'}
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
              whileTap={{ scale: 0.85 }}
              onClick={onClose}
              aria-label="Close"
              className="w-9 h-9 flex items-center justify-center rounded-full bg-surface-container hover:bg-surface-variant text-on-surface-variant transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </motion.button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-6">

            {/* Basic Info */}
            <section>
              <p className="font-semibold text-[13px] text-on-surface-variant uppercase tracking-wider mb-3">
                Basic Info
              </p>
              <div className="flex flex-col gap-3">
                <Field label="Venue Name *">
                  <TextInput
                    value={form.name}
                    onChange={v => set('name', v)}
                    placeholder="e.g. PlayHub Pickleball Central"
                  />
                </Field>

                <Field label="Type">
                  <div className="flex gap-2">
                    {(['pickleball', 'box cricket'] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => set('type', t)}
                        className={`flex-1 h-[44px] rounded-xl font-medium text-[14px] border-[1.5px] capitalize transition-colors cursor-pointer ${
                          form.type === t
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-outline-variant text-on-surface-variant hover:border-primary/40'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </Field>

                <Field label="Address *">
                  <TextInput
                    value={form.address}
                    onChange={v => set('address', v)}
                    placeholder="1200 Baseline Road, Downtown District"
                  />
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
                    <TextInput
                      value={form.distance}
                      onChange={v => set('distance', v)}
                      placeholder="e.g. 1.2 mi"
                    />
                  </Field>
                  <Field label="Price / hr (₹)">
                    <TextInput
                      value={form.price}
                      onChange={v => set('price', Number(v))}
                      type="number"
                      placeholder="600"
                    />
                  </Field>
                </div>
              </div>
            </section>

            {/* Images */}
            <section>
              <p className="font-semibold text-[13px] text-on-surface-variant uppercase tracking-wider mb-3">
                Images
              </p>
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
                        aria-label="Remove image"
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

            {/* Amenities */}
            <section>
              <p className="font-semibold text-[13px] text-on-surface-variant uppercase tracking-wider mb-3">
                Amenities
              </p>
              <div className="flex flex-wrap gap-2">
                {ALL_AMENITIES.map(a => {
                  const active = form.amenities.includes(a.key);
                  return (
                    <button
                      key={a.key}
                      onClick={() => toggleAmenity(a.key)}
                      className={`h-[36px] px-3 rounded-full border-[1.5px] font-medium text-[13px] flex items-center gap-1.5 transition-colors cursor-pointer ${
                        active
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-outline-variant text-on-surface-variant hover:border-primary/40'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">{a.key}</span>
                      {a.label}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Courts (existing venues only) */}
            {!isNew && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold text-[13px] text-on-surface-variant uppercase tracking-wider">
                    Courts
                  </p>
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
                    {courts.map(court =>
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
                            <p className="text-[13px] text-on-surface-variant">
                              {court.surface} · {court.isIndoor ? 'Indoor' : 'Outdoor'}
                            </p>
                          </div>
                          <button
                            onClick={() => setEditingCourtId(court.id)}
                            aria-label={`Edit ${court.name}`}
                            className="w-8 h-8 flex items-center justify-center rounded-full text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                        </motion.div>
                      )
                    )}
                    {courts.length === 0 && editingCourtId !== 'new' && (
                      <p className="text-[14px] text-on-surface-variant text-center py-3">
                        No courts yet — add one above.
                      </p>
                    )}
                  </div>
                )}
              </section>
            )}

            {/* Danger Zone */}
            {!isNew && (
              <section className="border-t border-error/20 pt-4">
                <p className="font-semibold text-[13px] text-on-surface-variant uppercase tracking-wider mb-3">
                  Danger Zone
                </p>
                {confirmDelete ? (
                  <div className="bg-error-container/30 border border-error/30 rounded-2xl p-4 flex flex-col gap-3">
                    <p className="text-[14px] text-on-error-container font-medium">
                      This will permanently delete the venue and all its courts. This cannot be undone.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfirmDelete(false)}
                        className="flex-1 h-[40px] rounded-full border border-outline-variant text-on-surface font-medium text-[14px] cursor-pointer hover:bg-surface-container transition-colors"
                      >
                        Cancel
                      </button>
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={handleDeleteVenue}
                        disabled={deleting}
                        className="flex-1 h-[40px] rounded-full bg-error text-on-error font-medium text-[14px] flex items-center justify-center gap-1 hover:opacity-90 cursor-pointer disabled:opacity-60"
                      >
                        {deleting && (
                          <span className="material-symbols-outlined animate-spin text-[16px]">sync</span>
                        )}
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
              <p className="text-[13px] text-error bg-error-container/20 px-4 py-3 rounded-xl">
                {error}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-surface-variant/50 shrink-0 bg-surface-container-lowest">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSaveVenue}
              disabled={saving}
              className="w-full h-[52px] rounded-full bg-primary text-on-primary font-semibold text-[16px] flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60 cursor-pointer"
            >
              {saving ? (
                <>
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                    className="material-symbols-outlined"
                  >
                    sync
                  </motion.span>{' '}
                  Saving…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">save</span>{' '}
                  {isNew ? 'Create Venue' : 'Save Changes'}
                </>
              )}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
