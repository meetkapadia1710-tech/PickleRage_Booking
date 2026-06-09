import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

const variants = {
  fade: {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
  },
  slide: {
    initial: { opacity: 0, x: 56 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -56 },
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
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
