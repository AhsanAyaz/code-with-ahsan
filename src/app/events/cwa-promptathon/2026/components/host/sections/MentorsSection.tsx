"use client";

import { motion } from "framer-motion";
import SlideBackground from "../SlideBackground";
import { MENTORS, ORGANIZERS, headingFont } from "../../../constants";

export default function MentorsSection() {
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
          maxWidth: 800,
          padding: "0 40px",
        }}
      >
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{
            fontFamily: headingFont,
            fontSize: "clamp(40px, 6vw, 80px)",
            color: "#F0EEFF",
            letterSpacing: "0.06em",
            margin: "0 0 32px 0",
          }}
        >
          Mentors & Organizers
        </motion.h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 32, alignItems: "center" }}>
          {/* Mentors */}
          {MENTORS.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              style={{ textAlign: "center" }}
            >
              <p style={{ color: "#00F5FF", fontFamily: "var(--font-space-mono, monospace)", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 12 }}>
                Mentor{MENTORS.length > 1 ? "s" : ""}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
                {MENTORS.map((name, i) => (
                  <motion.div
                    key={name}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.2 + i * 0.08 }}
                    style={{
                      background: "rgba(0,245,255,0.08)",
                      border: "1px solid rgba(0,245,255,0.3)",
                      borderRadius: 8,
                      padding: "10px 24px",
                      fontFamily: headingFont,
                      fontSize: 22,
                      color: "#F0EEFF",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {name}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Organizers */}
          {ORGANIZERS.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.35 }}
              style={{ textAlign: "center" }}
            >
              <p style={{ color: "#6C2BD9", fontFamily: "var(--font-space-mono, monospace)", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 12 }}>
                Organizers
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
                {ORGANIZERS.map((name, i) => (
                  <motion.div
                    key={name}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.35 + i * 0.07 }}
                    style={{
                      background: "rgba(108,43,217,0.1)",
                      border: "1px solid rgba(108,43,217,0.3)",
                      borderRadius: 8,
                      padding: "8px 20px",
                      fontFamily: headingFont,
                      fontSize: 20,
                      color: "#F0EEFF",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {name}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
