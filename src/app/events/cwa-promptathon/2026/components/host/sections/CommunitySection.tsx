"use client";

import { motion } from "framer-motion";
import SlideBackground from "../SlideBackground";
import { COMMUNITY_STATS } from "../../../constants";

export default function CommunitySection() {
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
      }}
    >
      <SlideBackground />
      <div
        style={{
          position: "relative",
          zIndex: 10,
          textAlign: "center",
          width: "100%",
          maxWidth: 900,
          padding: "0 40px",
        }}
      >
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{
            fontFamily: "var(--font-bebas, 'Bebas Neue', sans-serif)",
            fontSize: "clamp(48px, 7vw, 88px)",
            color: "#F0EEFF",
            letterSpacing: "0.06em",
            margin: "0 0 48px 0",
          }}
        >
          Our Community
        </motion.h2>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 24,
            justifyContent: "center",
          }}
        >
          {COMMUNITY_STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: 0.1 + i * 0.1,
                ease: [0.16, 1, 0.3, 1],
              }}
              style={{
                background: "rgba(108,43,217,0.08)",
                border: "1px solid rgba(108,43,217,0.3)",
                borderRadius: 12,
                padding: "28px 32px",
                minWidth: 180,
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-bebas, 'Bebas Neue', sans-serif)",
                  fontSize: "clamp(36px, 5vw, 56px)",
                  color: "#00F5FF",
                  letterSpacing: "0.04em",
                  lineHeight: 1,
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-space-mono, monospace)",
                  fontSize: 11,
                  color: "rgba(240,238,255,0.5)",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginTop: 8,
                }}
              >
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
