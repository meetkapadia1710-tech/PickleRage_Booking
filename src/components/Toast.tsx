import { motion, AnimatePresence } from 'framer-motion';

export default function Toast({ message }: { message: string | null }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.95 }}
          transition={{ type: 'spring', damping: 24, stiffness: 350 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[120] bg-on-background text-background px-5 py-3 rounded-full font-medium text-[14px] shadow-[0_8px_24px_rgba(0,0,0,0.25)] whitespace-nowrap"
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
