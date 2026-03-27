"use client";

import { motion } from "framer-motion";
import SlideBackground from "../SlideBackground";
import { headingFont } from "../../../constants";

const CTA_ITEMS = [
  {
    icon: "💬",
    audience: "Viewers",
    color: "#00F5FF",
    border: "rgba(0,245,255,0.3)",
    bg: "rgba(0,245,255,0.06)",
    text: "Drop your feedback in the comments — we read every one!",
  },
  {
    icon: "🚀",
    audience: "Attendees",
    color: "#6C2BD9",
    border: "rgba(108,43,217,0.4)",
    bg: "rgba(108,43,217,0.08)",
    text: "Join our community for more meetups, hackathons & workshops.",
    link: "codewithahsan.dev/discord",
  },
  {
    icon: "🤝",
    audience: "Companies",
    color: "#FFD600",
    border: "rgba(255,214,0,0.3)",
    bg: "rgba(255,214,0,0.06)",
    text: "Interested in sponsoring our next event? Let's talk.",
    emails: ["ahsan@visionwise.solutions", "maham.tahir@visionwise.solutions"],
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
      }}
    >
      <SlideBackground />
      <div
        style={{
          position: "relative",
          zIndex: 10,
          width: "100%",
          maxWidth: 900,
          padding: "0 40px",
          textAlign: "center",
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
            margin: "0 0 8px 0",
            lineHeight: 1,
          }}
        >
          That&apos;s a Wrap!
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={{
            fontFamily: "var(--font-space-mono, monospace)",
            fontSize: 12,
            color: "rgba(240,238,255,0.35)",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            marginBottom: 40,
          }}
        >
          CWA Prompt-A-Thon 2026
        </motion.p>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {CTA_ITEMS.map((item, i) => (
            <motion.div
              key={item.audience}
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 + i * 0.12 }}
              style={{
                background: item.bg,
                border: `1px solid ${item.border}`,
                borderRadius: 12,
                padding: "18px 28px",
                display: "flex",
                alignItems: "center",
                gap: 20,
                textAlign: "left",
              }}
            >
              <span style={{ fontSize: 32, flexShrink: 0 }}>{item.icon}</span>
              <div style={{ flex: 1 }}>
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
                <p
                  style={{
                    color: "#F0EEFF",
                    fontSize: "clamp(14px, 1.8vw, 18px)",
                    margin: 0,
                    lineHeight: 1.4,
                  }}
                >
                  {item.text}
                </p>
                {item.link && (
                  <p
                    style={{
                      fontFamily: "var(--font-space-mono, monospace)",
                      fontSize: 13,
                      color: item.color,
                      margin: "6px 0 0",
                    }}
                  >
                    {item.link}
                  </p>
                )}
                {item.emails && (
                  <p
                    style={{
                      fontFamily: "var(--font-space-mono, monospace)",
                      fontSize: 13,
                      color: item.color,
                      margin: "6px 0 0",
                    }}
                  >
                    {item.emails.join("  ·  ")}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
