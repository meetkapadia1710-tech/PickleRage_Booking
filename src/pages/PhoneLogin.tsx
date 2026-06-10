import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { signInWithGoogle } from '../auth/googleSignIn';

const FEATURES = [
  { icon: 'sports_tennis',  label: 'Pickleball',   sub: 'Premium courts' },
  { icon: 'sports_cricket', label: 'Box Cricket',  sub: 'Reserve slots'  },
  { icon: 'group',          label: 'Split Pay',    sub: 'With friends'   },
] as const;

const STATS = [
  { label: '50+ Daily Slots', gold: true  },
  { label: '5★ Venues',       gold: false },
  { label: 'Book in 30s',     gold: false },
] as const;

export default function PhoneLogin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      // Platform-specific flow (website popup vs APK native chooser) lives
      // in src/auth/ — this page stays platform-agnostic.
      const user = await signInWithGoogle();
      if (!user) {
        // User closed the account chooser/popup — not an error.
        setLoading(false);
        return;
      }

      // Routing handles redirect to /complete-profile if phone is missing
      navigate('/home');
    } catch (err: unknown) {
      console.error('Google Sign-in failed:', err);
      setError(err instanceof Error ? err.message : 'Sign-in failed. Please try again.');
      setLoading(false);
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
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1.5px, transparent 1.5px)',
            backgroundSize: '28px 28px',
          }}
        />
        {/* Soft glows as radial gradients — filter:blur over areas this big is
            too slow for the Android WebView and made page transitions jerky */}
        <div className="absolute -top-1/2 -right-1/4 w-full h-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_0%,transparent_70%)]" />
        <div className="absolute bottom-[20%] -left-1/4 w-3/4 h-1/2 bg-[radial-gradient(circle_at_center,rgba(255,191,0,0.15)_0%,transparent_70%)]" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen pt-[env(safe-area-inset-top)]">

        {/* ── Top green section ──────────────────────────────────────────────── */}
        <div className="flex flex-col px-6 pt-10 pb-8 flex-1">

          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2.5 mb-12"
          >
            <div className="w-10 h-10 rounded-[13px] bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-inner">
              <span
                className="material-symbols-outlined text-white text-[22px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                sports_tennis
              </span>
            </div>
            <span className="text-white font-bold text-[22px] tracking-tight">PlayHub</span>
          </motion.div>

          {/* Headline */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="mb-10"
          >
            <h1 className="text-white font-extrabold text-[40px] leading-[1.05] tracking-tight">
              Your Game,<br />
              Your Court.<br />
              <span className="text-secondary-container">Your Rules.</span>
            </h1>
            <p className="text-white/55 text-[14px] mt-4 leading-relaxed max-w-xs">
              Premium pickleball & box cricket courts. Instant slots. Split costs with friends.
            </p>
          </motion.div>

          {/* Feature cards */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
            className="flex gap-2.5 mb-8"
          >
            {FEATURES.map(f => (
              <div
                key={f.icon}
                className="flex-1 bg-white/10 backdrop-blur-sm border border-white/10 rounded-[18px] p-3.5 flex flex-col items-center gap-1.5"
              >
                <span
                  className="material-symbols-outlined text-white text-[26px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {f.icon}
                </span>
                <p className="text-white text-[11px] font-semibold text-center leading-tight">{f.label}</p>
                <p className="text-white/45 text-[10px] text-center leading-tight">{f.sub}</p>
              </div>
            ))}
          </motion.div>

          <div className="flex-1" />

          {/* Stats chips */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.24 }}
            className="flex items-center gap-2 flex-wrap"
          >
            {STATS.map(s => (
              <span
                key={s.label}
                className={`text-[11px] font-semibold px-3 py-1.5 rounded-full ${
                  s.gold
                    ? 'bg-secondary-container text-on-secondary-container'
                    : 'bg-white/12 text-white/70'
                }`}
              >
                {s.label}
              </span>
            ))}
          </motion.div>
        </div>

        {/* ── Bottom CTA card ────────────────────────────────────────────────── */}
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 58, damping: 14 }}
          className="bg-background rounded-t-[32px] px-6 pt-8 pb-[calc(2.5rem+env(safe-area-inset-bottom))] shadow-[0_-8px_48px_rgba(0,0,0,0.22)]"
        >
          <p className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-widest mb-1.5">
            Get started
          </p>
          <h2 className="font-bold text-[24px] text-on-background mb-6 leading-tight">
            Sign in to PlayHub
          </h2>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 overflow-hidden"
              >
                <div className="bg-error/10 border border-error/20 text-error p-3.5 rounded-xl text-[13px] font-medium">
                  {error}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Google button */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            disabled={loading}
            onClick={handleGoogleSignIn}
            className="w-full h-[54px] bg-surface-container-low border border-outline-variant/60 rounded-[27px] font-semibold text-[15px] flex items-center justify-center gap-3 hover:bg-surface-container transition-colors shadow-sm active:scale-95 disabled:opacity-60 cursor-pointer mb-5"
          >
            {loading ? (
              <span className="material-symbols-outlined animate-spin text-[22px] text-on-surface">sync</span>
            ) : (
              <>
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
                <span className="text-on-surface">Continue with Google</span>
              </>
            )}
          </motion.button>

          <p className="text-center text-[11px] text-on-surface-variant/65 leading-relaxed">
            By signing in you agree to our{' '}
            <a href="#" className="text-primary/80 underline underline-offset-2">Terms of Service</a>
            {' '}and{' '}
            <a href="#" className="text-primary/80 underline underline-offset-2">Privacy Policy</a>
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
