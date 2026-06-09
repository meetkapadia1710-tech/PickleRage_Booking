import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleAuthProvider, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

export default function PhoneLogin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for redirect result when component mounts
  useEffect(() => {
    const handleRedirectResult = async () => {
      setLoading(true);
      try {
        const result = await getRedirectResult(auth);
        if (result && result.user) {
          const user = result.user;
          // Create/Update user document in Firestore
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);

          if (!userSnap.exists()) {
            await setDoc(userRef, {
              uid: user.uid,
              displayName: user.displayName || 'Anonymous Player',
              email: user.email || '',
              photoURL: user.photoURL || '',
              createdAt: new Date().toISOString(),
            });
          }
          navigate('/home');
        }
      } catch (err: any) {
        console.error('Error during Google Sign-in redirect check:', err);
        setError(err.message || 'An error occurred during authentication redirect.');
      } finally {
        setLoading(false);
      }
    };

    handleRedirectResult();
  }, [navigate]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      // Use signInWithRedirect to avoid pop-up blockers and COOP policy restrictions
      await signInWithRedirect(auth, provider);
    } catch (err: any) {
      console.error('Error initiating Google Sign-in:', err);
      setError(err.message || 'An error occurred initiating authentication.');
      setLoading(false);
    }
  };

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

      <main className="flex-1 flex flex-col justify-between px-6 py-12 max-w-md mx-auto w-full relative z-10">
        {/* Brand Header */}
        <div className="flex items-center space-x-2 mt-4 self-center md:self-start">
          <span className="material-symbols-outlined text-primary text-[36px]" style={{ fontVariationSettings: "'FILL' 1" }}>sports_tennis</span>
          <span className="font-bold text-[24px] text-primary tracking-tight">PlayHub</span>
        </div>
        
        {/* Middle illustration and titles */}
        <div className="my-auto space-y-8 text-center flex flex-col items-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 100 }}
            className="w-48 h-48 bg-primary/5 rounded-full flex items-center justify-center relative shadow-[inset_0_4px_12px_rgba(0,52,43,0.06)]"
          >
            <span className="material-symbols-outlined text-primary text-[96px] animate-pulse" style={{ fontVariationSettings: "'FILL' 0" }}>sports_tennis</span>
            {/* Visual orbit element */}
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

        {/* Bottom actions & auth */}
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
            className="w-full h-[52px] bg-secondary-container hover:bg-secondary-container/95 text-on-secondary-container rounded-[26px] font-semibold text-[16px] flex items-center justify-center gap-3 transition-all shadow-md active:scale-95 disabled:opacity-75 cursor-pointer relative"
          >
            {loading ? (
              <span className="material-symbols-outlined animate-spin text-[24px]">sync</span>
            ) : (
              <>
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
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
      </main>
    </motion.div>
  );
}
