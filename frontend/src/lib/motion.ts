import { cubicBezier } from "framer-motion";

export const motionEasings = {
  out: cubicBezier(0.22, 1, 0.36, 1),
  inOut: cubicBezier(0.4, 0, 0.2, 1),
  in: cubicBezier(0.4, 0, 1, 1),
} as const;

export const motionDurations = {
  xs: 0.12,
  sm: 0.18,
  md: 0.24,
  lg: 0.32,
} as const;

export const screenFadeSlide = {
  initial: { opacity: 0, y: 8, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -6, filter: "blur(6px)" },
} as const;

export const popIn = {
  initial: { opacity: 0, scale: 0.98, y: 4 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.98, y: 2 },
} as const;

export const pressable = {
  whileHover: { y: -1 },
  whileTap: { scale: 0.98, y: 0 },
} as const;

