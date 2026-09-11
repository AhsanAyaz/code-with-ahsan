"use client";

import { motion } from "framer-motion";
import SlideShell from "../SlideShell";
import { EVENT, HACKATHON_THEMES, THEME_RULE, headingFont } from "../../../constants";

export default function ThemesSection() {
  return (
    <SlideShell
      eyebrow="Theme reveal"
      title="Hackathon Tracks"
      subtitle={THEME_RULE}
      maxWidth={1320}
    >
      {/* The umbrella theme sits above the three tracks — they are all routes
          to the same outcome. Sourced from EVENT.theme so it cannot drift from
          the hero and About section. */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 22,
          margin: "-16px 0 34px",
        }}
      >
        <div
          style={{
            height: 1,
            flex: 1,
            maxWidth: 140,
            background: "linear-gradient(90deg, transparent, rgba(108,43,217,0.7))",
          }}
        />
        <span
          style={{
            fontFamily: headingFont,
            fontSize: "clamp(30px, 3.4vw, 46px)",
            letterSpacing: "0.05em",
            lineHeight: 1.1,
            color: "#00F5FF",
            textShadow: "0 0 32px rgba(0,245,255,0.35)",
            textAlign: "center",
          }}
        >
          {EVENT.theme}
        </span>
        <div
          style={{
            height: 1,
            flex: 1,
            maxWidth: 140,
            background: "linear-gradient(90deg, rgba(108,43,217,0.7), transparent)",
          }}
        />
      </motion.div>

      <div style={{ display: "flex", gap: 18, alignItems: "stretch" }}>
        {HACKATHON_THEMES.map((theme, i) => (
          <motion.div
            key={theme.title}
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 + i * 0.13, ease: [0.16, 1, 0.3, 1] }}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              background: "rgba(108,43,217,0.06)",
              border: `1px solid ${theme.accent}44`,
              borderTop: `3px solid ${theme.accent}`,
              borderRadius: 12,
              padding: "20px 22px 22px",
              textAlign: "left",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span
                style={{
                  fontFamily: "var(--font-space-mono, monospace)",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  color: "#07020F",
                  background: theme.accent,
                  borderRadius: 4,
                  padding: "3px 8px",
                }}
              >
                THEME {String(i + 1).padStart(2, "0")}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-space-mono, monospace)",
                  fontSize: 10,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: theme.accent,
                }}
              >
                {theme.scope}
              </span>
            </div>

            <h3
              style={{
                fontFamily: headingFont,
                fontSize: 34,
                color: "#F0EEFF",
                letterSpacing: "0.04em",
                lineHeight: 1.1,
                margin: "0 0 12px",
              }}
            >
              {theme.title}
            </h3>

            <p
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: 13,
                lineHeight: 1.55,
                color: "rgba(240,238,255,0.55)",
                margin: "0 0 16px",
              }}
            >
              {theme.description}
            </p>

            <div
              style={{
                borderLeft: `2px solid ${theme.accent}`,
                paddingLeft: 14,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-space-mono, monospace)",
                  fontSize: 9.5,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: theme.accent,
                  marginBottom: 5,
                }}
              >
                Build this
              </div>
              <p
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 14.5,
                  fontWeight: 500,
                  lineHeight: 1.5,
                  color: "#F0EEFF",
                  margin: 0,
                }}
              >
                {theme.brief}
              </p>
            </div>

            {/* mt-auto equivalent — keeps the load-bearing line on one baseline
                across all three columns however long the copy above runs. */}
            <div
              style={{
                marginTop: "auto",
                paddingTop: 14,
                borderTop: "1px solid rgba(108,43,217,0.25)",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-space-mono, monospace)",
                  fontSize: 9.5,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "rgba(240,238,255,0.4)",
                  marginBottom: 5,
                }}
              >
                AI is load-bearing
              </div>
              <p
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 12.5,
                  lineHeight: 1.5,
                  color: "rgba(240,238,255,0.62)",
                  margin: 0,
                }}
              >
                {theme.loadBearing}
              </p>

              {theme.note.length > 0 && (
                <p
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: 12,
                    lineHeight: 1.45,
                    color: "#FFD600",
                    background: "rgba(255,214,0,0.08)",
                    border: "1px solid rgba(255,214,0,0.25)",
                    borderRadius: 8,
                    padding: "9px 12px",
                    margin: "12px 0 0",
                  }}
                >
                  ⚠ {theme.note}
                </p>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </SlideShell>
  );
}
