import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function SplashScreen() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/login');
    }, 2500);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="bg-primary text-on-primary h-screen w-full flex flex-col items-center justify-center relative overflow-hidden"
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 flex items-center justify-center opacity-40">
        {/* The radial gradient already fades smoothly — blur-[100px] on a
            150vw element was the single heaviest paint in the app */}
        <div className="w-[150vw] h-[150vw] md:w-[80vw] md:h-[80vw] bg-[radial-gradient(circle_at_center,_var(--color-primary-container),_var(--color-primary),_var(--color-primary))] rounded-full"></div>
      </div>
      
      <motion.div 
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center space-y-6 z-10"
      >
        <motion.div
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut', delay: 0.8 }}
          className="w-[100px] h-[100px] rounded-3xl bg-primary-container/30 flex items-center justify-center backdrop-blur-md border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.2)]"
        >
          <span className="material-symbols-outlined text-[56px] text-[#afefdd]" style={{ fontVariationSettings: "'FILL' 1, 'wght' 300" }}>sports_tennis</span>
        </motion.div>
        <h1 className="font-bold text-[28px] md:text-[30px] tracking-tight text-white text-center">
          PlayHub
        </h1>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute bottom-24 flex flex-col items-center z-10"
      >
        <svg className="w-8 h-8 text-[#afefdd] animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5"></circle>
          <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </motion.div>
    </motion.div>
  );
}
