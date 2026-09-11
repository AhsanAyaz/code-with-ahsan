"use client";

import { motion } from "framer-motion";
import SlideBackground from "../SlideBackground";
import { headingFont, EVENT, CWA_MARK_SRC, VENUE } from "../../../constants";

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
          {/* The community mark opens the deck — no crop or ring, the logo
              already carries its own hexagon. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={CWA_MARK_SRC}
            alt="Code With Ahsan community"
            style={{
              width: 190,
              height: 190,
              objectFit: "contain",
              filter: "drop-shadow(0 0 38px rgba(108,43,217,0.55))",
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
            CWA Ship Karachi
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
            <div style={{ height: 2, width: 80, background: "#6C2BD9" }} />
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
            <div style={{ height: 2, width: 80, background: "#6C2BD9" }} />
          </div>
          <div
            style={{
              fontFamily: "var(--font-space-mono, monospace)",
              fontSize: 14,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "rgba(240,238,255,0.55)",
              marginTop: 14,
            }}
          >
            Organised by CWA Community
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
          {EVENT.dateLabel}
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
          1-Day AI Hackathon · On-site
        </motion.p>

        {/* Venue — the host badge for the day */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.75, ease: [0.16, 1, 0.3, 1] }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            marginTop: 12,
            padding: "14px 26px",
            borderRadius: 12,
            background: "rgba(108,43,217,0.08)",
            border: "1px solid rgba(108,43,217,0.35)",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-space-mono, monospace)",
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "rgba(240,238,255,0.45)",
            }}
          >
            Hosted at
          </span>
          <div
            style={{ background: "#FFFFFF", borderRadius: 8, padding: "8px 12px", lineHeight: 0 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={VENUE.logoUrl}
              alt={`${VENUE.name} logo`}
              style={{ height: 38, width: "auto", display: "block", objectFit: "contain" }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
