import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";

import { motionDurations, motionEasings } from "@/lib/motion";

type Props = React.PropsWithChildren<{
  className?: string;
  hover?: "none" | "lift" | "twist";
}>;

export function AnimatedIcon({ className, hover = "lift", children }: Props) {
  const reduceMotion = useReducedMotion();
  const hoverAnim =
    hover === "twist"
      ? { rotate: -6, scale: 1.03 }
      : hover === "lift"
        ? { y: -1, scale: 1.03 }
        : undefined;

  return (
    <motion.span
      className={className}
      initial={false}
      whileHover={reduceMotion ? undefined : hoverAnim}
      whileTap={reduceMotion ? undefined : { scale: 0.98 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { duration: motionDurations.sm, ease: motionEasings.out }
      }
      style={{ display: "inline-flex" }}
    >
      {children}
    </motion.span>
  );
}

