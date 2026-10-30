"use client";

import { useSyncExternalStore } from "react";
import { useReducedMotion } from "framer-motion";

const noopSubscribe = () => () => {};

/**
 * framer-motion's useReducedMotion() reads matchMedia during the first client
 * render, which differs from the server render and causes hydration mismatches
 * on anything whose initial state depends on it. This wraps it so the server
 * render and hydration see `null` (not known yet), and the real preference
 * arrives straight after.
 *
 * - `true`: render final states, no looping or pointer/scroll-linked motion.
 * - `false`: full motion.
 * - `null`: not known yet; start nothing, render the same markup as the server.
 */
export const useReduceMotion = (): boolean | null => {
  const prefersReduced = useReducedMotion();
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );
  return hydrated ? prefersReduced === true : null;
};

/** True only for a precise pointer (mouse, trackpad), never touch. */
export const useFinePointer = (): boolean =>
  useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(hover: hover) and (pointer: fine)").matches,
    () => false
  );
