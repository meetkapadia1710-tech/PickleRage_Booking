import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

// Exit is deliberately much faster than enter: with AnimatePresence
// mode="wait" the two run back-to-back, so a slow exit doubles how long
// every navigation feels. Native apps get out of the way instantly.
const EXIT_TRANSITION = { duration: 0.12, ease: 'easeIn' } as const;

const variants = {
  fade: {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8, transition: EXIT_TRANSITION },
  },
  slide: {
    initial: { opacity: 0, x: 56 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -56, transition: EXIT_TRANSITION },
  },
} as const;

export default function PageTransition({
  children,
  className,
  variant = 'fade',
}: {
  children: ReactNode;
  className?: string;
  variant?: keyof typeof variants;
}) {
  const v = variants[variant];
  return (
    <motion.div
      initial={v.initial}
      animate={v.animate}
      exit={v.exit}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
