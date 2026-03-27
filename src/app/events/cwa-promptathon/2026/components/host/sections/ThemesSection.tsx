"use client";

import { motion } from "framer-motion";
import SlideBackground from "../SlideBackground";
import { HACKATHON_THEMES, headingFont } from "../../../constants";

export default function ThemesSection() {
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
          maxWidth: 1100,
          padding: "0 40px",
        }}
      >
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{
            fontFamily: headingFont,
            fontSize: "clamp(48px, 7vw, 88px)",
            color: "#F0EEFF",
            letterSpacing: "0.06em",
            margin: "0 0 48px 0",
          }}
        >
          Hackathon Themes
        </motion.h2>

        <div
          style={{
            display: "flex",
            gap: 24,
            justifyContent: "center",
          }}
        >
          {HACKATHON_THEMES.map((theme, i) => (
            <motion.div
              key={theme.title}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: 0.1 + i * 0.12,
                ease: [0.16, 1, 0.3, 1],
              }}
              style={{
                flex: 1,
                background: "rgba(108,43,217,0.07)",
                border: "1px solid rgba(108,43,217,0.4)",
                borderRadius: 12,
                padding: "32px 28px",
                textAlign: "left",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-space-mono, monospace)",
                  fontSize: 11,
                  color: "#FFD600",
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  marginBottom: 12,
                }}
              >
                Theme {String(i + 1).padStart(2, "0")}
              </div>
              <h3
                style={{
                  fontFamily: headingFont,
                  fontSize: "clamp(24px, 2.5vw, 36px)",
                  color: "#F0EEFF",
                  letterSpacing: "0.05em",
                  margin: "0 0 16px 0",
                  lineHeight: 1.1,
                }}
              >
                {theme.title}
              </h3>
              <p
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 14,
                  color: "rgba(240,238,255,0.65)",
                  lineHeight: 1.65,
                  margin: 0,
                }}
              >
                {theme.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
