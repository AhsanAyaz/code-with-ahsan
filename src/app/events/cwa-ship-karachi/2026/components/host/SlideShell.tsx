"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import SlideBackground from "./SlideBackground";
import { headingFont } from "../../constants";

/**
 * The frame every slide shares: full-viewport dark stage, grid background, a
 * centred column, and an optional eyebrow + title.
 *
 * maxWidth caps at 1200 and the stage carries right/bottom padding so content
 * never runs under the persistent QR card that SlideChrome pins bottom-right.
 */
type Props = {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  maxWidth?: number;
  children: ReactNode;
};

export default function SlideShell({ eyebrow, title, subtitle, maxWidth = 1200, children }: Props) {
  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        background: "#07020F",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        padding: "88px 200px 132px",
        boxSizing: "border-box",
      }}
    >
      <SlideBackground />
      <div
        style={{
          position: "relative",
          zIndex: 10,
          width: "100%",
          maxWidth,
          textAlign: "center",
        }}
      >
        {eyebrow && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            style={{
              fontFamily: "var(--font-space-mono, monospace)",
              fontSize: 12,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "#FFD600",
              marginBottom: 14,
            }}
          >
            {eyebrow}
          </motion.div>
        )}

        {title && (
          <motion.h2
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            style={{
              fontFamily: headingFont,
              fontSize: "clamp(40px, 6vw, 80px)",
              color: "#F0EEFF",
              letterSpacing: "0.06em",
              lineHeight: 1.05,
              margin: 0,
            }}
          >
            {title}
          </motion.h2>
        )}

        {subtitle && (
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.12 }}
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 17,
              color: "rgba(240,238,255,0.62)",
              lineHeight: 1.6,
              margin: "16px auto 0",
              maxWidth: 760,
            }}
          >
            {subtitle}
          </motion.p>
        )}

        <div style={{ marginTop: title || subtitle ? 44 : 0 }}>{children}</div>
      </div>
    </div>
  );
}
