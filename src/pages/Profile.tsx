import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { auth, db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import AppHeader from '../components/AppHeader';
import Toast from '../components/Toast';

// ─── Sheet backdrop + slide-up wrapper ───────────────────────────────────────
function Sheet({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/45 backdrop-blur-[3px]"
          />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="relative bg-surface-container-lowest rounded-t-[32px] md:rounded-2xl shadow-[0_-12px_36px_rgba(0,52,43,0.18)] pb-safe max-h-[85vh] flex flex-col w-full md:max-w-md md:mx-auto md:mb-6 z-10 border-t border-outline-variant/40"
          >
            {/* Drag handle / Grabber */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-12 h-1.5 rounded-full bg-outline-variant/60" />
            </div>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 shrink-0 border-b border-outline-variant/30">
              <h2 className="font-bold text-[18px] text-on-surface">{title}</h2>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.9 }} onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-container-low hover:bg-surface-container border border-outline-variant/40 text-on-surface-variant transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </motion.button>
            </div>
            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 px-5 pt-4 pb-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ─── Edit Profile sheet ───────────────────────────────────────────────────────
function EditProfileSheet({ open, onClose, showToast }: { open: boolean; onClose: () => void; showToast: (msg: string, icon?: string) => void }) {
  const { currentUser } = useAuth();
  const [name, setName] = useState(currentUser?.displayName ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open) setName(currentUser?.displayName ?? '');
  }, [open, currentUser]);

  const handleSave = async () => {
    if (!currentUser || !name.trim()) return;
    setSaving(true);
    try {
      await updateProfile(currentUser, { displayName: name.trim() });
      // Update Firestore user doc if it exists
      try {
        await updateDoc(doc(db, 'users', currentUser.uid), { displayName: name.trim() });
      } catch {
        // users doc may not exist yet — that's fine
      }
      setSaved(true);
      showToast('Profile updated!', 'person');
      setTimeout(() => { setSaved(false); onClose(); }, 1200);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Edit Profile">
      <div className="flex flex-col gap-5 pb-4">
        {/* Avatar (display-only, no upload in this phase) */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-surface-container-high border-2 border-surface">
            <img
              src={currentUser?.photoURL ?? undefined}
              alt="avatar"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <span className="text-[12px] text-on-surface-variant">Photo from Google account</span>
        </div>

        {/* Display name */}
        <div className="flex flex-col gap-1.5">
          <label className="font-medium text-[13px] text-on-surface-variant uppercase tracking-wider">Display Name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            placeholder="Your name"
            className="h-[48px] px-4 border-[1.5px] border-outline-variant/75 rounded-xl bg-surface-container-lowest text-on-surface text-[16px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          />
        </div>

        {/* Email (read-only) */}
        <div className="flex flex-col gap-1.5">
          <label className="font-medium text-[13px] text-on-surface-variant uppercase tracking-wider">Email</label>
          <div className="h-[48px] px-4 border-[1.5px] border-outline-variant/65 rounded-xl bg-surface-container-low text-on-surface-variant text-[16px] flex items-center">
            {currentUser?.email ?? 'Not available'}
          </div>
          <p className="text-[12px] text-on-surface-variant">Email is managed by Google and cannot be changed here.</p>
        </div>

        {/* Save */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="h-[48px] rounded-full font-semibold text-[14px] flex items-center justify-center gap-2 transition-all mt-2 disabled:opacity-50 cursor-pointer"
          style={{ backgroundColor: saved ? 'var(--color-secondary-container)' : 'var(--color-primary)', color: saved ? 'var(--color-on-secondary-container)' : 'var(--color-on-primary)' }}
        >
          {saving ? (
            <><motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }} className="material-symbols-outlined">progress_activity</motion.span> Saving…</>
          ) : saved ? (
            <><span className="material-symbols-outlined">check_circle</span> Saved!</>
          ) : (
            'Save Changes'
          )}
        </motion.button>
      </div>
    </Sheet>
  );
}

// ─── Notifications sheet ──────────────────────────────────────────────────────
const NOTIF_PREFS_KEY = 'playhub_notif_prefs';

function loadPrefs() {
  try { return JSON.parse(localStorage.getItem(NOTIF_PREFS_KEY) ?? 'null') ?? defaultPrefs(); } catch { return defaultPrefs(); }
}
function defaultPrefs() {
  return { bookingConfirm: true, bookingReminder: true, cancellation: true, promos: false };
}

function NotificationsSheet({ open, onClose, showToast }: { open: boolean; onClose: () => void; showToast: (msg: string, icon?: string) => void }) {
  const [prefs, setPrefs] = useState(loadPrefs);

  const toggle = (key: keyof ReturnType<typeof defaultPrefs>) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    localStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(next));
    const label = items.find(item => item.key === key)?.title ?? 'Setting';
    showToast(`${label} ${next[key] ? 'enabled' : 'disabled'}`, next[key] ? 'notifications_active' : 'notifications_off');
  };

  const items: { key: keyof ReturnType<typeof defaultPrefs>; icon: string; title: string; subtitle: string }[] = [
    { key: 'bookingConfirm', icon: 'event_available', title: 'Booking Confirmations', subtitle: 'When a booking is confirmed or updated' },
    { key: 'bookingReminder', icon: 'alarm', title: 'Booking Reminders', subtitle: '1 hour before your court time' },
    { key: 'cancellation', icon: 'event_busy', title: 'Cancellation Alerts', subtitle: 'When a booking is cancelled' },
    { key: 'promos', icon: 'local_activity', title: 'Offers & Promotions', subtitle: 'Deals on courts and memberships' },
  ];

  return (
    <Sheet open={open} onClose={onClose} title="Notifications">
      <div className="flex flex-col gap-1 pb-4">
        {items.map(item => (
          <div key={item.key} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-surface-container-low transition-colors">
            <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[14px] text-on-background">{item.title}</p>
              <p className="text-[13px] text-on-surface-variant truncate">{item.subtitle}</p>
            </div>
            {/* Toggle */}
            <button
              onClick={() => toggle(item.key)}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 cursor-pointer ${prefs[item.key] ? 'bg-primary' : 'bg-surface-container-highest'}`}
              aria-checked={prefs[item.key]}
              role="switch"
            >
              <motion.span
                animate={{ x: prefs[item.key] ? 24 : 4 }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                className="absolute left-0 top-1 w-4 h-4 rounded-full bg-white shadow-sm"
              />
            </button>
          </div>
        ))}
        <p className="text-[12px] text-on-surface-variant text-center mt-4">Preferences saved locally on this device.</p>
      </div>
    </Sheet>
  );
}

// ─── Payment Methods sheet ────────────────────────────────────────────────────
const CARDS_KEY = 'playhub_saved_cards';

interface SavedCard { id: string; last4: string; brand: string; expiry: string }

function loadCards(): SavedCard[] {
  try { return JSON.parse(localStorage.getItem(CARDS_KEY) ?? '[]'); } catch { return []; }
}

function PaymentSheet({ open, onClose, showToast }: { open: boolean; onClose: () => void; showToast: (msg: string, icon?: string) => void }) {
  const [cards, setCards] = useState<SavedCard[]>(loadCards);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ number: '', expiry: '', cvv: '', brand: 'Visa' });
  const [error, setError] = useState('');

  const formatNumber = (v: string) => v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
  const formatExpiry = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 4);
    return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
  };

  const handleAdd = () => {
    const digits = form.number.replace(/\s/g, '');
    if (digits.length < 16) { setError('Enter a valid 16-digit card number.'); return; }
    if (form.expiry.length < 5) { setError('Enter a valid expiry (MM/YY).'); return; }
    if (form.cvv.length < 3) { setError('Enter a valid CVV.'); return; }
    setError('');
    const brand = digits.startsWith('4') ? 'Visa' : digits.startsWith('5') ? 'Mastercard' : 'Card';
    const newCard: SavedCard = {
      id: Date.now().toString(),
      last4: digits.slice(-4),
      brand,
      expiry: form.expiry,
    };
    const next = [...cards, newCard];
    setCards(next);
    localStorage.setItem(CARDS_KEY, JSON.stringify(next));
    showToast('Card saved successfully!', 'credit_card');
    setAdding(false);
    setForm({ number: '', expiry: '', cvv: '', brand: 'Visa' });
  };

  const handleRemove = (id: string) => {
    const next = cards.filter(c => c.id !== id);
    setCards(next);
    localStorage.setItem(CARDS_KEY, JSON.stringify(next));
    showToast('Card removed.', 'delete');
  };

  return (
    <Sheet open={open} onClose={onClose} title="Payment Methods">
      <div className="flex flex-col gap-3 pb-4">
        {cards.length === 0 && !adding && (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="w-14 h-14 rounded-full bg-surface-container-low flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-[28px] text-outline">credit_card_off</span>
            </div>
            <p className="font-medium text-[14px] text-on-surface mb-1">No saved cards</p>
            <p className="text-[13px] text-on-surface-variant">Add a card to book courts faster.</p>
          </div>
        )}

        {cards.map(card => (
          <div key={card.id} className="flex items-center gap-3 bg-surface-container-low p-4 rounded-2xl">
            <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined">credit_card</span>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-[14px] text-on-surface">{card.brand} •••• {card.last4}</p>
              <p className="text-[13px] text-on-surface-variant">Expires {card.expiry}</p>
            </div>
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={() => handleRemove(card.id)}
              className="w-8 h-8 flex items-center justify-center rounded-full text-error hover:bg-error-container/20 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">delete</span>
            </motion.button>
          </div>
        ))}

        <AnimatePresence>
          {adding && (
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
              className="flex flex-col gap-3 bg-surface-container-low p-4 rounded-2xl"
            >
              <input
                placeholder="Card number"
                value={form.number}
                onChange={e => setForm(f => ({ ...f, number: formatNumber(e.target.value) }))}
                className="h-[44px] px-3 border-[1.5px] border-outline-variant/75 rounded-xl bg-surface-container-lowest text-on-surface text-[15px] focus:outline-none focus:border-primary transition-colors"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  placeholder="MM/YY"
                  value={form.expiry}
                  onChange={e => setForm(f => ({ ...f, expiry: formatExpiry(e.target.value) }))}
                  className="h-[44px] px-3 border-[1.5px] border-outline-variant/75 rounded-xl bg-surface-container-lowest text-on-surface text-[15px] focus:outline-none focus:border-primary transition-colors"
                />
                <input
                  placeholder="CVV"
                  value={form.cvv}
                  maxLength={4}
                  onChange={e => setForm(f => ({ ...f, cvv: e.target.value.replace(/\D/g, '') }))}
                  className="h-[44px] px-3 border-[1.5px] border-outline-variant/75 rounded-xl bg-surface-container-lowest text-on-surface text-[15px] focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              {error && <p className="text-[13px] text-error">{error}</p>}
              <div className="flex gap-2 mt-1">
                <button onClick={() => { setAdding(false); setError(''); }} className="flex-1 h-[44px] rounded-full border border-outline-variant text-on-surface-variant font-semibold text-[14px] hover:bg-surface-container transition-colors cursor-pointer">Cancel</button>
                <motion.button whileTap={{ scale: 0.97 }} onClick={handleAdd} className="flex-1 h-[44px] rounded-full bg-primary text-on-primary font-semibold text-[14px] hover:opacity-90 transition-opacity cursor-pointer">Save Card</motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!adding && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setAdding(true)}
            className="h-[48px] rounded-full border-[1.5px] border-primary text-primary font-semibold text-[14px] flex items-center justify-center gap-2 hover:bg-primary/5 transition-colors cursor-pointer mt-1"
          >
            <span className="material-symbols-outlined text-[20px]">add_card</span>
            Add New Card
          </motion.button>
        )}

        <p className="text-[11px] text-on-surface-variant text-center leading-relaxed">
          Card details are stored locally on this device for demo purposes and are not transmitted to any server.
        </p>
      </div>
    </Sheet>
  );
}

// ─── Help & Support sheet ─────────────────────────────────────────────────────
const FAQS = [
  { q: 'How do I cancel a booking?', a: 'Go to Bookings, find your upcoming booking, and tap "Cancel". Cancellations made more than 2 hours before the slot are fully refunded.' },
  { q: 'How do I reschedule a court?', a: 'Cancel your current booking and create a new one for your preferred time. Rescheduling is not available directly yet.' },
  { q: 'What happens if the venue cancels?', a: 'You will receive a full refund within 3–5 business days. We will also notify you via the app and email.' },
  { q: 'Can I book for someone else?', a: 'Yes. The booking will be under your account but you can let anyone use the slot. Share the booking confirmation with them.' },
  { q: 'How do I add or change my payment method?', a: 'Go to Profile → Payment Methods to add, view, or remove saved cards.' },
];

function HelpSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <Sheet open={open} onClose={onClose} title="Help & Support">
      <div className="flex flex-col gap-3 pb-4">
        {/* Contact row */}
        <div className="grid grid-cols-2 gap-3 mb-2">
          <a
            href="mailto:support@playhub.app"
            className="flex flex-col items-center gap-2 bg-surface-container-low p-4 rounded-2xl hover:bg-surface-container transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">mail</span>
            </div>
            <span className="font-semibold text-[13px] text-on-surface">Email Us</span>
            <span className="text-[12px] text-on-surface-variant text-center">support@playhub.app</span>
          </a>
          <a
            href="https://wa.me/911234567890"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-2 bg-surface-container-low p-4 rounded-2xl hover:bg-surface-container transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">chat</span>
            </div>
            <span className="font-semibold text-[13px] text-on-surface">WhatsApp</span>
            <span className="text-[12px] text-on-surface-variant text-center">Chat with us</span>
          </a>
        </div>

        {/* FAQ */}
        <p className="font-semibold text-[14px] text-on-surface mb-1">Frequently Asked Questions</p>
        {FAQS.map((faq, i) => (
          <div key={i} className="bg-surface-container-low rounded-2xl overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === i ? null : i)}
              className="w-full flex items-center justify-between gap-3 p-4 text-left cursor-pointer hover:bg-surface-container transition-colors"
            >
              <span className="font-medium text-[14px] text-on-surface leading-snug flex-1">{faq.q}</span>
              <motion.span
                animate={{ rotate: expanded === i ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="material-symbols-outlined text-outline text-[20px] shrink-0"
              >
                expand_more
              </motion.span>
            </button>
            <AnimatePresence>
              {expanded === i && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  className="overflow-hidden"
                >
                  <p className="px-4 pb-4 text-[14px] text-on-surface-variant leading-relaxed">{faq.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </Sheet>
  );
}

// ─── Sign-out confirmation dialog ─────────────────────────────────────────────
function SignOutDialog({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center px-8">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-on-background/30 backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 8 }}
            transition={{ type: 'spring', damping: 24, stiffness: 320 }}
            className="relative w-full max-w-sm bg-surface-container-lowest rounded-[24px] p-6 shadow-[0_16px_48px_rgba(0,52,43,0.30)]"
          >
            <div className="w-12 h-12 rounded-full bg-error-container flex items-center justify-center mb-4 mx-auto">
              <span className="material-symbols-outlined text-on-error-container">logout</span>
            </div>
            <h2 className="font-semibold text-[20px] text-on-surface text-center mb-1">Sign out?</h2>
            <p className="text-[14px] text-on-surface-variant text-center mb-6">You'll need to sign in again to book courts.</p>
            <div className="flex gap-3">
              <motion.button whileTap={{ scale: 0.97 }} onClick={onClose}
                className="flex-1 h-[48px] rounded-full border-[1.5px] border-outline-variant text-on-surface font-semibold text-[14px] hover:bg-surface-container-low transition-colors cursor-pointer">
                Stay
              </motion.button>
              <motion.button whileTap={{ scale: 0.97 }} onClick={onConfirm}
                className="flex-1 h-[48px] rounded-full bg-error text-on-error font-semibold text-[14px] hover:opacity-90 transition-opacity cursor-pointer">
                Sign Out
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ─── Main Profile page ────────────────────────────────────────────────────────
export default function Profile() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [bookingCount, setBookingCount] = useState(0);
  const [hoursPlayed, setHoursPlayed] = useState(0);

  // Sheet open states
  const [editOpen, setEditOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      if (!currentUser) return;
      try {
        const q = query(
          collection(db, 'bookings'),
          where('userId', '==', currentUser.uid),
          where('status', '==', 'confirmed')
        );
        const snap = await getDocs(q);
        setBookingCount(snap.size);
        // Each booking = 1 hour slot
        setHoursPlayed(snap.size);
      } catch (err) {
        console.error('Error fetching booking stats:', err);
      }
    };
    fetchStats();
  }, [currentUser]);

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      navigate('/login');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const displayName = currentUser?.displayName || 'PlayHub Player';
  const email = currentUser?.email || 'No email associated';
  const photoURL = currentUser?.photoURL ?? undefined;

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

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="bg-background text-on-background min-h-screen pb-[96px] antialiased"
      >
        {/* TopAppBar */}
        <AppHeader />

        <main className="max-w-md mx-auto md:max-w-4xl px-5 pt-6">
          {/* ── Profile Header ── */}
          <section className="flex flex-col items-center mb-6 relative pt-10">
            <div className="w-24 h-24 rounded-full bg-surface-container-high overflow-hidden shadow-sm mb-4 border-2 border-surface">
              {photoURL ? (
                <img alt="avatar" className="w-full h-full object-cover" src={photoURL} referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary/5">
                  <span className="material-symbols-outlined text-[48px] text-primary">person</span>
                </div>
              )}
            </div>
            <h1 className="font-semibold text-[20px] text-on-background mb-1 truncate max-w-[280px] md:max-w-md px-2 text-center" title={displayName}>{displayName}</h1>
            <p className="text-[14px] text-on-surface-variant truncate max-w-[280px] md:max-w-md px-2 text-center" title={email}>{email}</p>
          </section>

          {/* ── Stats ── */}
          <section className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-surface-container-lowest p-4 rounded-[20px] border border-outline-variant/65 shadow-[0_4px_16px_rgba(0,52,43,0.15)] flex flex-col items-center">
              <span className="font-bold text-[24px] text-primary mb-1">{bookingCount}</span>
              <span className="font-medium text-[12px] text-on-surface-variant uppercase tracking-wider">Bookings</span>
            </div>
            <div className="bg-surface-container-lowest p-4 rounded-[20px] border border-outline-variant/65 shadow-[0_4px_16px_rgba(0,52,43,0.15)] flex flex-col items-center">
              <span className="font-bold text-[24px] text-primary mb-1">{hoursPlayed}</span>
              <span className="font-medium text-[12px] text-on-surface-variant uppercase tracking-wider">Hours Played</span>
            </div>
          </section>

          {/* ── Settings List (iOS Grouped Style) ── */}
          <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant/50 shadow-[0_4px_16px_rgba(0,52,43,0.1)] overflow-hidden">
            <div className="flex flex-col">
              <SettingItem icon="person" iconBg="bg-[#007aff]" title="Edit Profile" subtitle="Update your display name" onClick={() => setEditOpen(true)} />
              <SettingItem icon="notifications" iconBg="bg-[#ff9500]" title="Notifications" subtitle="Manage your alert preferences" onClick={() => setNotifOpen(true)} />
              <SettingItem icon="credit_card" iconBg="bg-[#34c759]" title="Payment Methods" subtitle="Cards and billing info" onClick={() => setPaymentOpen(true)} />
              <SettingItem icon="help" iconBg="bg-[#5856d6]" title="Help & Support" subtitle="FAQs and contact options" onClick={() => setHelpOpen(true)} isLast />
            </div>
          </section>

          {/* ── Sign Out ── */}
          <div className="mt-8 mb-12 flex justify-center">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setSignOutOpen(true)}
              className="px-6 py-3 text-error font-semibold text-[14px] hover:bg-error-container/20 rounded-full transition-colors flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
              Sign Out
            </motion.button>
          </div>
        </main>
      </motion.div>

      {/* ── Sheets & dialogs ── */}
      <EditProfileSheet open={editOpen} onClose={() => setEditOpen(false)} showToast={showToast} />
      <NotificationsSheet open={notifOpen} onClose={() => setNotifOpen(false)} showToast={showToast} />
      <PaymentSheet open={paymentOpen} onClose={() => setPaymentOpen(false)} showToast={showToast} />
      <HelpSheet open={helpOpen} onClose={() => setHelpOpen(false)} />
      <SignOutDialog open={signOutOpen} onClose={() => setSignOutOpen(false)} onConfirm={handleSignOut} />

      {/* Dynamic Island style Toast */}
      <Toast message={toastMsg} icon={toastIcon} />
    </>
  );
}

// ─── Shared SettingItem (iOS Grouped Style) ───────────────────────────────────
function SettingItem({ icon, iconBg, title, subtitle, onClick, isLast = false }: {
  icon: string; iconBg: string; title: string; subtitle: string; onClick: () => void; isLast?: boolean;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`w-full flex items-center px-4 py-3 hover:bg-surface-container-low transition-all cursor-pointer text-left ${!isLast ? 'border-b border-outline-variant/30' : ''}`}
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 text-white shrink-0 ${iconBg} shadow-sm`}>
        <span className="material-symbols-outlined text-[18px] font-medium" style={{ fontVariationSettings: "'wght' 500" }}>{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-[14px] text-on-surface leading-tight">{title}</h3>
        <p className="text-[12px] text-on-surface-variant mt-0.5 truncate">{subtitle}</p>
      </div>
      <span className="material-symbols-outlined text-outline-variant/80 text-[20px] ml-2 shrink-0">chevron_right</span>
    </motion.button>
  );
}
