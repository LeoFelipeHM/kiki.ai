import { motionEasings } from '@/lib/motion';

/** Transição entre páginas internas da landing (home, recursos, etc.) */
export const pageCrossfade = {
  initial: { opacity: 0, y: 16 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.44, ease: motionEasings.out },
  },
  exit: {
    opacity: 0,
    y: -12,
    transition: { duration: 0.28, ease: motionEasings.in },
  },
} as const;

/** Blocos que entram ao rolar — suave e legível */
export const inViewSoft = {
  initial: { opacity: 0, y: 36 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.18, margin: '0px 0px -12% 0px' },
  transition: { duration: 0.58, ease: motionEasings.out },
} as const;

/** Hero: filhos em cascata */
export const heroContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.11, delayChildren: 0.06 },
  },
} as const;

export const heroItem = {
  hidden: { opacity: 0, y: 22 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: motionEasings.out },
  },
} as const;

/** Cards em grelha (recursos, como funciona, preços) */
export const cardStaggerContainer = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.12, delayChildren: 0.05 },
  },
} as const;

export const cardStaggerItem = {
  hidden: { opacity: 0, y: 40, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.52, ease: motionEasings.out },
  },
} as const;
