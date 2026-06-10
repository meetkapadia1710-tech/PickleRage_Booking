import { motion, AnimatePresence } from 'framer-motion';

export default function Toast({ message, icon }: { message: string | null; icon?: string }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -40, scale: 0.8, x: '-50%' }}
          animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
          exit={{ opacity: 0, y: -30, scale: 0.85, x: '-50%' }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="fixed top-6 left-1/2 z-[200] max-w-sm w-[90%] bg-primary/90 backdrop-blur-[16px] text-white px-5 py-3.5 rounded-full border border-white/10 shadow-[0_8px_32px_rgba(0,52,43,0.25)] flex items-center justify-center gap-2.5"
        >
          {icon && (
            <span className="material-symbols-outlined text-[18px] text-secondary-container shrink-0">
              {icon}
            </span>
          )}
          <span className="font-semibold text-[13px] tracking-wide text-center">{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
