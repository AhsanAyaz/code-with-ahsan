"use client";

import { useRef, type MouseEvent, type ReactNode } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { useFinePointer, useReduceMotion } from "./useReduceMotion";

type Props = {
  children: ReactNode;
  className?: string;
  /** Maximum tilt in degrees. */
  max?: number;
};

/** A card that tilts slightly toward the pointer. Pointer only; static for touch and reduced motion. */
const TiltCard = ({ children, className = "", max = 6 }: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReduceMotion();
  const finePointer = useFinePointer();
  const active = reduce === false && finePointer;

  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springX = useSpring(rotateX, { stiffness: 200, damping: 20 });
  const springY = useSpring(rotateY, { stiffness: 200, damping: 20 });

  const handleMove = (event: MouseEvent<HTMLDivElement>) => {
    if (!active || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    rotateY.set(px * max * 2);
    rotateX.set(-py * max * 2);
  };

  const reset = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      style={active ? { rotateX: springX, rotateY: springY, transformPerspective: 800 } : undefined}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default TiltCard;
