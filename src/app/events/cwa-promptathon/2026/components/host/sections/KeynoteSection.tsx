"use client";

import { motion } from "framer-motion";
import SlideBackground from "../SlideBackground";
import { headingFont } from "../../../constants";

export default function KeynoteSection() {
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
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/static/images/ahsan-hero.jpg"
            alt="Ahsan"
            style={{
              width: 120,
              height: 120,
              borderRadius: "50%",
              border: "3px solid #6C2BD9",
              objectFit: "cover",
              boxShadow: "0 0 40px rgba(108,43,217,0.4)",
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1
            style={{
              fontFamily: headingFont,
              fontSize: "clamp(60px, 10vw, 120px)",
              color: "#F0EEFF",
              letterSpacing: "0.06em",
              lineHeight: 1,
              margin: 0,
            }}
          >
            CWA PROMPT-A-THON
          </h1>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
              marginTop: 8,
            }}
          >
            <div
              style={{ height: 2, width: 80, background: "#6C2BD9" }}
            />
            <span
              style={{
                fontFamily: headingFont,
                fontSize: "clamp(36px, 6vw, 72px)",
                color: "#6C2BD9",
                letterSpacing: "0.1em",
              }}
            >
              2026
            </span>
            <div
              style={{ height: 2, width: 80, background: "#6C2BD9" }}
            />
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          style={{
            fontFamily: "var(--font-space-mono, monospace)",
            fontSize: 16,
            color: "#00F5FF",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            margin: 0,
          }}
        >
          March 28, 2026
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.55 }}
          style={{
            fontFamily: "var(--font-space-mono, monospace)",
            fontSize: 13,
            color: "rgba(240,238,255,0.4)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            margin: 0,
          }}
        >
          1-Day Generative AI Hackathon
        </motion.p>
      </div>
    </div>
  );
}
