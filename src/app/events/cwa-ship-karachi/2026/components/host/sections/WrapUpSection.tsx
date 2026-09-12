"use client";

import { motion } from "framer-motion";
import SlideBackground from "../SlideBackground";
import { COMMUNITY_DISCORD_URL, DISCORD_QR_SRC, EVENT, headingFont } from "../../../constants";

/** Kept small and to the side — the QR is the point of this slide. */
const CTA_ITEMS = [
  {
    audience: "Attendees",
    color: "#00F5FF",
    text: "Keep building with us: meetups, hackathons and mentorship all year.",
  },
  {
    audience: "Companies",
    color: "#FFD600",
    text: "Want to sponsor the next one? ahsan@visionwise.solutions",
  },
];

export default function WrapUpSection() {
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
        padding: "80px 80px 96px",
        boxSizing: "border-box",
      }}
    >
      <SlideBackground />

      <div
        style={{
          position: "relative",
          zIndex: 10,
          width: "100%",
          maxWidth: 1280,
          display: "flex",
          alignItems: "center",
          gap: 72,
        }}
      >
        {/* Message */}
        <div style={{ flex: 1, textAlign: "left" }}>
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            style={{
              fontFamily: headingFont,
              fontSize: "clamp(64px, 9vw, 132px)",
              color: "#F0EEFF",
              letterSpacing: "0.05em",
              margin: 0,
              lineHeight: 0.95,
            }}
          >
            Thank You
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.18 }}
            style={{
              fontFamily: "var(--font-space-mono, monospace)",
              fontSize: 13,
              color: "#00F5FF",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              margin: "18px 0 0",
            }}
          >
            {EVENT.name}
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.28 }}
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 19,
              lineHeight: 1.65,
              color: "rgba(240,238,255,0.7)",
              margin: "22px 0 0",
              maxWidth: 480,
            }}
          >
            You shipped something real in a single day. Take the momentum with you. The community is
            where the next one starts.
          </motion.p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 32 }}>
            {CTA_ITEMS.map((item, i) => (
              <motion.div
                key={item.audience}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.45, delay: 0.4 + i * 0.12 }}
                style={{
                  borderLeft: `3px solid ${item.color}`,
                  padding: "6px 0 6px 16px",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-space-mono, monospace)",
                    fontSize: 10,
                    color: item.color,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  {item.audience}
                </span>
                <span
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: 14.5,
                    color: "rgba(240,238,255,0.68)",
                    lineHeight: 1.5,
                  }}
                >
                  {item.text}
                </span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* The QR is the point of this slide — sized to scan from the back of
            the room while people are packing up. SlideChrome's small corner QR
            is suppressed here so there is only one. */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}
        >
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 24,
              padding: 26,
              lineHeight: 0,
              boxShadow: "0 0 70px rgba(108,43,217,0.55)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={DISCORD_QR_SRC}
              alt="Scan to join the Code With Ahsan Discord"
              style={{
                width: "min(380px, 30vw)",
                height: "min(380px, 30vw)",
                display: "block",
              }}
            />
          </div>

          <div
            style={{
              fontFamily: headingFont,
              fontSize: 38,
              color: "#F0EEFF",
              letterSpacing: "0.06em",
            }}
          >
            Join Our Discord Community
          </div>

          <div
            style={{
              fontFamily: "var(--font-space-mono, monospace)",
              fontSize: 15,
              color: "#00F5FF",
              letterSpacing: "0.08em",
            }}
          >
            {COMMUNITY_DISCORD_URL.replace("https://", "")}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
