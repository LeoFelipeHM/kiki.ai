import * as React from "react";
import { motion, type MotionProps, useReducedMotion } from "framer-motion";

import {
  motionDurations,
  motionEasings,
  screenFadeSlide,
} from "@/lib/motion";

type Props = React.PropsWithChildren<{
  className?: string;
  motionKey: string;
}>;

export function ScreenTransition({ className, motionKey, children }: Props) {
  const reduceMotion = useReducedMotion();

  const transition: MotionProps["transition"] = reduceMotion
    ? { duration: 0 }
    : {
        duration: motionDurations.md,
        ease: motionEasings.out,
      };

  return (
    <motion.div
      key={motionKey}
      className={className}
      initial={reduceMotion ? false : screenFadeSlide.initial}
      animate={reduceMotion ? undefined : screenFadeSlide.animate}
      exit={reduceMotion ? undefined : screenFadeSlide.exit}
      transition={transition}
    >
      {children}
    </motion.div>
  );
}

