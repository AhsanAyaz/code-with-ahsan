"use client";

import { useEffect, useState } from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import { useReduceMotion } from "./useReduceMotion";

/**
 * Thin amber reading-progress bar. The site header is sticky, so the bar sits
 * directly beneath it (measured, not hard-coded) instead of being covered.
 */
const ScrollProgress = () => {
  const reduce = useReduceMotion();
  const { scrollYProgress } = useScroll();
  const smooth = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.3 });
  const [top, setTop] = useState(0);

  useEffect(() => {
    const header = document.querySelector("header");
    if (!header) return;
    const measure = () => setTop(Math.max(0, Math.round(header.getBoundingClientRect().bottom)));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    window.addEventListener("scroll", measure, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", measure);
    };
  }, []);

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 z-40 h-[3px] origin-left bg-(--sm-amber)"
      // Reduced motion: the bar still tracks position (it is information), but
      // without the spring easing.
      style={{ top, scaleX: reduce ? scrollYProgress : smooth }}
    />
  );
};

export default ScrollProgress;
