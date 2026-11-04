"use client";

import { useRef, type MouseEvent, type ReactNode } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { useFinePointer, useReduceMotion } from "./useReduceMotion";

type Props = {
  href: string;
  children: ReactNode;
  className?: string;
  external?: boolean;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  /** Fraction of the pointer offset the link follows. */
  strength?: number;
};

/**
 * A link that leans slightly toward the pointer while hovered and springs back
 * on leave. Pointer only: touch and reduced motion get a plain link.
 */
const MagneticLink = ({
  href,
  children,
  className = "",
  external,
  onClick,
  strength = 0.3,
}: Props) => {
  const ref = useRef<HTMLAnchorElement>(null);
  const reduce = useReduceMotion();
  const finePointer = useFinePointer();
  const active = reduce === false && finePointer;

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 220, damping: 16, mass: 0.4 });
  const springY = useSpring(y, { stiffness: 220, damping: 16, mass: 0.4 });

  const handleMove = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!active || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    x.set((event.clientX - (rect.left + rect.width / 2)) * strength);
    y.set((event.clientY - (rect.top + rect.height / 2)) * strength);
  };

  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.a
      ref={ref}
      href={href}
      onClick={onClick}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      onBlur={reset}
      style={active ? { x: springX, y: springY } : undefined}
      className={className}
    >
      {children}
    </motion.a>
  );
};

export default MagneticLink;
