import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';

export default function CompleteProfile() {
  const { currentUser, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState(currentUser?.displayName || '');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const firstName = (currentUser?.displayName || 'Player').split(' ')[0];
  const phoneValid = /^[6-9]\d{9}$/.test(phone);

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) { setError('Please enter your name.'); return; }
    if (!phoneValid) { setError('Enter a valid 10-digit Indian mobile number.'); return; }

    setSaving(true);
    setError(null);
    try {
      await updateDoc(doc(db, 'users', currentUser!.uid), {
        displayName: trimmedName,
        phone: phone.trim(),
        profileComplete: true,
        updatedAt: new Date().toISOString(),
      });
      await refreshProfile();
      navigate('/home');
    } catch (err) {
      console.error(err);
      setError('Failed to save profile. Please try again.');
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-primary flex flex-col relative overflow-hidden"
    >
      {/* Background texture */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(circle, white 1.5px, transparent 1.5px)', backgroundSize: '28px 28px' }}
        />
        {/* Soft glows as radial gradients — filter:blur over areas this big is
            too slow for the Android WebView and made page transitions jerky */}
        <div className="absolute -top-1/2 -right-1/4 w-full h-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_0%,transparent_70%)]" />
        <div className="absolute bottom-0 -left-1/4 w-3/4 h-1/2 bg-[radial-gradient(circle_at_center,rgba(255,191,0,0.10)_0%,transparent_70%)]" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen pt-[env(safe-area-inset-top)]">

        {/* Top green section */}
        <div className="flex flex-col items-center px-6 pt-10 pb-10 flex-1">

          {/* Logo */}
          <div className="flex items-center gap-2.5 self-start mb-10">
            <div className="w-9 h-9 rounded-[10px] bg-white/15 flex items-center justify-center">
              <span
                className="material-symbols-outlined text-white text-[20px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                sports_tennis
              </span>
            </div>
            <span className="text-white font-bold text-[20px] tracking-tight">PlayHub</span>
          </div>

          {/* Avatar */}
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 120, damping: 12 }}
            className="mb-5"
          >
            <div className="w-[88px] h-[88px] rounded-full overflow-hidden ring-4 ring-white/25 shadow-xl">
              <Avatar
                name={currentUser?.displayName || 'Player'}
                photoURL={currentUser?.photoURL ?? undefined}
                size={88}
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="text-center"
          >
            <h1 className="text-white font-bold text-[26px] leading-tight">
              Welcome, {firstName}!
            </h1>
            <p className="text-white/55 text-[14px] mt-2 leading-relaxed">
              One quick step to set up your player profile.
            </p>
          </motion.div>

          {/* Step indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-1.5 mt-6"
          >
            <div className="w-6 h-1.5 rounded-full bg-white/40" />
            <div className="w-8 h-1.5 rounded-full bg-white" />
            <div className="w-6 h-1.5 rounded-full bg-white/40" />
          </motion.div>
        </div>

        {/* Bottom form card */}
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 60, damping: 14 }}
          className="bg-background rounded-t-[32px] px-6 pt-8 pb-[calc(2.5rem+env(safe-area-inset-bottom))] shadow-[0_-8px_40px_rgba(0,0,0,0.2)]"
        >
          <h2 className="font-bold text-[22px] text-on-background mb-1">Complete Your Profile</h2>
          <p className="text-[13px] text-on-surface-variant mb-6">
            So friends can find you and you can split bookings.
          </p>

          <div className="flex flex-col gap-4">

            {/* Name */}
            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-[11px] text-on-surface-variant uppercase tracking-wider">
                Your Name
              </label>
              <div className={`flex items-center gap-3 bg-surface-container-low border rounded-2xl px-4 h-[54px] transition-colors ${
                name.trim().length > 1 ? 'border-primary/50' : 'border-outline-variant/50'
              }`}>
                <span className="material-symbols-outlined text-[20px] text-on-surface-variant shrink-0">person</span>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="flex-1 bg-transparent text-[15px] text-on-surface outline-none placeholder:text-on-surface-variant/40 font-medium"
                  autoComplete="name"
                />
                {name.trim().length > 1 && (
                  <span
                    className="material-symbols-outlined text-[18px] text-primary shrink-0"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    check_circle
                  </span>
                )}
              </div>
            </div>

            {/* Phone */}
            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-[11px] text-on-surface-variant uppercase tracking-wider">
                Mobile Number
              </label>
              <div className={`flex items-center gap-3 bg-surface-container-low border rounded-2xl px-4 h-[54px] transition-colors ${
                phoneValid ? 'border-primary/50' : 'border-outline-variant/50'
              }`}>
                <span className="material-symbols-outlined text-[20px] text-on-surface-variant shrink-0">phone</span>
                <div className="flex items-center gap-2 border-r border-outline-variant/30 pr-3 shrink-0">
                  <span className="text-[15px]">🇮🇳</span>
                  <span className="font-semibold text-[14px] text-on-surface">+91</span>
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="9876543210"
                  className="flex-1 bg-transparent text-[15px] text-on-surface outline-none placeholder:text-on-surface-variant/40 font-medium tracking-wider"
                  inputMode="numeric"
                  autoComplete="tel"
                />
                {phoneValid && (
                  <span
                    className="material-symbols-outlined text-[18px] text-primary shrink-0"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    check_circle
                  </span>
                )}
              </div>
              <p className="text-[11px] text-on-surface-variant/60 px-1">
                Used so friends can find you by number.
              </p>
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-xl text-[13px] font-medium">
                    {error}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSave}
              disabled={saving}
              className="w-full h-[54px] bg-primary text-on-primary rounded-[27px] font-bold text-[16px] flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(0,52,43,0.25)] hover:opacity-90 active:scale-95 transition-all disabled:opacity-60 cursor-pointer mt-2"
            >
              {saving ? (
                <span className="material-symbols-outlined animate-spin text-[22px]">sync</span>
              ) : (
                <>
                  <span>Continue to PlayHub</span>
                  <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                </>
              )}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
