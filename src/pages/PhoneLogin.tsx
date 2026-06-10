import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleAuthProvider, signInWithPopup, signInWithCredential } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

type Step = 'login' | 'profile';

export default function PhoneLogin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step state
  const [step, setStep] = useState<Step>('login');
  const [pendingUid, setPendingUid] = useState<string>('');
  const [pendingDisplayName, setPendingDisplayName] = useState('');

  // Profile form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // ── Google Sign In ──────────────────────────────────────────────────────────
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      let uid = '';
      let displayName = '';
      let email = '';
      let photoURL = '';

      if (Capacitor.isNativePlatform()) {
        const googleUser = await GoogleAuth.signIn();
        const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);
        const result = await signInWithCredential(auth, credential);
        uid = result.user.uid;
        displayName = result.user.displayName || '';
        email = result.user.email || '';
        photoURL = googleUser.imageUrl || result.user.photoURL || '';
      } else {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        const result = await signInWithPopup(auth, provider);
        uid = result.user.uid;
        displayName = result.user.displayName || '';
        email = result.user.email || '';
        photoURL = result.user.photoURL || '';
      }

      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        // Brand new user — create minimal doc, then ask for profile
        await setDoc(userRef, {
          uid,
          displayName: displayName || 'Anonymous Player',
          email,
          photoURL,
          createdAt: new Date().toISOString(),
        });
        // Show profile collection step
        setPendingUid(uid);
        setPendingDisplayName(displayName);
        setName(displayName); // pre-fill with Google name
        setStep('profile');
        setLoading(false);
      } else {
        // Returning user — check if phone is missing
        const data = userSnap.data();
        if (!data.phone) {
          setPendingUid(uid);
          setPendingDisplayName(data.displayName || displayName);
          setName(data.displayName || displayName);
          setStep('profile');
          setLoading(false);
        } else {
          navigate('/home');
        }
      }
    } catch (err: unknown) {
      console.error('Google Sign-in failed:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during authentication.');
      setLoading(false);
    }
  };

  // ── Save Profile ────────────────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    setProfileError(null);

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName) { setProfileError('Please enter your name.'); return; }
    if (!/^[6-9]\d{9}$/.test(trimmedPhone)) {
      setProfileError('Enter a valid 10-digit Indian mobile number.');
      return;
    }

    // Check phone uniqueness
    setSavingProfile(true);
    try {
      const userRef = doc(db, 'users', pendingUid);
      await updateDoc(userRef, {
        displayName: trimmedName,
        phone: trimmedPhone,
        profileComplete: true,
        updatedAt: new Date().toISOString(),
      });
      navigate('/home');
    } catch (err) {
      console.error('Error saving profile:', err);
      setProfileError('Failed to save profile. Please try again.');
      setSavingProfile(false);
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="bg-background text-on-background min-h-screen flex flex-col font-sans relative overflow-hidden"
    >
      {/* Background ambient light effects */}
      <div className="absolute top-[-10%] left-[-20%] w-[60%] h-[50%] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-20%] w-[60%] h-[50%] rounded-full bg-secondary-container/10 blur-[120px] pointer-events-none" />

      <AnimatePresence mode="wait">

        {/* ── STEP 1: Login ─────────────────────────────────────────────────── */}
        {step === 'login' && (
          <motion.main
            key="login"
            initial={{ opacity: 0, x: 0 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            className="flex-1 flex flex-col justify-between px-6 py-12 max-w-md mx-auto w-full relative z-10"
          >
            {/* Brand Header */}
            <div className="flex items-center space-x-2 mt-4 self-center md:self-start">
              <span className="material-symbols-outlined text-primary text-[36px]" style={{ fontVariationSettings: "'FILL' 1" }}>sports_tennis</span>
              <span className="font-bold text-[24px] text-primary tracking-tight">PlayHub</span>
            </div>

            {/* Illustration */}
            <div className="my-auto space-y-8 text-center flex flex-col items-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 100 }}
                className="w-48 h-48 bg-primary/5 rounded-full flex items-center justify-center relative shadow-[inset_0_4px_12px_rgba(0,52,43,0.06)]"
              >
                <span className="material-symbols-outlined text-primary text-[96px] animate-pulse" style={{ fontVariationSettings: "'FILL' 0" }}>sports_tennis</span>
                <div className="absolute inset-0 border border-primary/20 rounded-full animate-[spin_20s_linear_infinite]" />
              </motion.div>

              <div className="space-y-3 px-2">
                <h1 className="font-bold text-[32px] tracking-tight leading-tight text-on-background">
                  Book Courts In <span className="text-primary">Seconds</span>
                </h1>
                <p className="text-[15px] text-on-surface-variant leading-relaxed">
                  Explore premium pickleball courts and box cricket arenas near you. Secure your slots instantly.
                </p>
              </div>
            </div>

            {/* Auth Actions */}
            <div className="space-y-6 w-full">
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-error/10 border border-error/20 text-error p-3.5 rounded-xl text-[13px] text-center font-medium"
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button
                whileTap={{ scale: 0.98 }}
                disabled={loading}
                onClick={handleGoogleSignIn}
                className="w-full h-[52px] bg-secondary-container hover:bg-secondary-container/95 text-on-secondary-container rounded-[26px] font-semibold text-[16px] flex items-center justify-center gap-3 transition-all shadow-md active:scale-95 disabled:opacity-75 cursor-pointer"
              >
                {loading ? (
                  <span className="material-symbols-outlined animate-spin text-[24px]">sync</span>
                ) : (
                  <>
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                    </svg>
                    <span>Sign in with Google</span>
                  </>
                )}
              </motion.button>

              <div className="text-center pt-2">
                <p className="font-medium text-[12px] text-on-surface-variant/75 leading-normal">
                  By signing in, you agree to our <a href="#" className="underline text-primary/80 hover:text-primary">Terms &amp; Conditions</a> and <a href="#" className="underline text-primary/80 hover:text-primary">Privacy Policy</a>
                </p>
              </div>
            </div>
          </motion.main>
        )}

        {/* ── STEP 2: Profile Completion ────────────────────────────────────── */}
        {step === 'profile' && (
          <motion.main
            key="profile"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            className="flex-1 flex flex-col px-6 py-12 max-w-md mx-auto w-full relative z-10"
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-10">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>sports_tennis</span>
              </div>
              <span className="font-bold text-[20px] text-primary tracking-tight">PlayHub</span>
            </div>

            {/* Welcome message */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-8"
            >
              <div className="w-16 h-16 bg-secondary-container/20 rounded-full flex items-center justify-center mb-5">
                <span className="material-symbols-outlined text-secondary text-[36px]" style={{ fontVariationSettings: "'FILL' 1" }}>waving_hand</span>
              </div>
              <h1 className="font-bold text-[28px] text-on-background leading-tight mb-2">
                Welcome{pendingDisplayName ? `, ${pendingDisplayName.split(' ')[0]}` : ''}! 👋
              </h1>
              <p className="text-[15px] text-on-surface-variant leading-relaxed">
                Just a few details to set up your player profile so friends can find you and you can split bookings.
              </p>
            </motion.div>

            {/* Form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
              className="flex flex-col gap-4 flex-1"
            >
              {/* Name field */}
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-[13px] text-on-surface uppercase tracking-wider">Your Name</label>
                <div className={`flex items-center gap-3 bg-surface-container-low border rounded-2xl px-4 h-[54px] transition-colors ${
                  name ? 'border-primary/40' : 'border-outline-variant/40'
                }`}>
                  <span className="material-symbols-outlined text-[20px] text-on-surface-variant shrink-0">person</span>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="flex-1 bg-transparent text-[15px] text-on-surface outline-none placeholder:text-on-surface-variant/50 font-medium"
                    autoComplete="name"
                  />
                  {name.trim().length > 1 && (
                    <span className="material-symbols-outlined text-[18px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  )}
                </div>
              </div>

              {/* Phone field */}
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-[13px] text-on-surface uppercase tracking-wider">Mobile Number</label>
                <div className={`flex items-center gap-3 bg-surface-container-low border rounded-2xl px-4 h-[54px] transition-colors ${
                  phone ? 'border-primary/40' : 'border-outline-variant/40'
                }`}>
                  <span className="material-symbols-outlined text-[20px] text-on-surface-variant shrink-0">phone</span>
                  <div className="flex items-center gap-2 border-r border-outline-variant/40 pr-3 mr-1">
                    <span className="text-[15px] font-semibold text-on-surface">🇮🇳 +91</span>
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="9876543210"
                    className="flex-1 bg-transparent text-[15px] text-on-surface outline-none placeholder:text-on-surface-variant/50 font-medium tracking-wider"
                    inputMode="numeric"
                    autoComplete="tel"
                  />
                  {/^[6-9]\d{9}$/.test(phone) && (
                    <span className="material-symbols-outlined text-[18px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  )}
                </div>
                <p className="text-[11px] text-on-surface-variant px-1">Used so friends can find you by phone number.</p>
              </div>

              {/* Error */}
              <AnimatePresence>
                {profileError && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-xl text-[13px] font-medium"
                  >
                    {profileError}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex-1" />

              {/* Submit */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="w-full h-[54px] bg-primary text-on-primary rounded-[27px] font-bold text-[16px] flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(0,52,43,0.2)] hover:opacity-90 active:scale-95 transition-all disabled:opacity-60 cursor-pointer"
              >
                {savingProfile ? (
                  <span className="material-symbols-outlined animate-spin text-[22px]">sync</span>
                ) : (
                  <>
                    <span>Continue to PlayHub</span>
                    <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                  </>
                )}
              </motion.button>
            </motion.div>
          </motion.main>
        )}

      </AnimatePresence>
    </motion.div>
  );
}
