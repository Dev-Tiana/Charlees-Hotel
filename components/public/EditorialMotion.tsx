'use client';

import { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';

const EDITORIAL_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function EditorialReveal({
  children,
  className = '',
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const shouldReduce = useReducedMotion();

  if (shouldReduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.6, delay, ease: EDITORIAL_EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function HeroEntrance({
  children,
  className = '',
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const shouldReduce = useReducedMotion();

  if (shouldReduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay, ease: EDITORIAL_EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function ImageReveal({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  const shouldReduce = useReducedMotion();

  if (shouldReduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.985 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.7, ease: EDITORIAL_EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
