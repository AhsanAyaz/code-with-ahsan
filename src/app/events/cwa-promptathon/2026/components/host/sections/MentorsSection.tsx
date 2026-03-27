"use client";

import { motion } from "framer-motion";
import SlideBackground from "../SlideBackground";
import { MENTORS } from "../../../constants";

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
            fontFamily: "var(--font-bebas, 'Bebas Neue', sans-serif)",
            fontSize: "clamp(48px, 7vw, 88px)",
            color: "#F0EEFF",
            letterSpacing: "0.06em",
            margin: "0 0 40px 0",
          }}
        >
          Mentors & Team
        </motion.h2>

        {MENTORS.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 16,
              justifyContent: "center",
            }}
          >
            {MENTORS.map((name, i) => (
              <motion.div
                key={name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 + i * 0.08 }}
                style={{
                  background: "rgba(108,43,217,0.1)",
                  border: "1px solid rgba(108,43,217,0.3)",
                  borderRadius: 8,
                  padding: "12px 24px",
                  fontFamily: "var(--font-bebas, 'Bebas Neue', sans-serif)",
                  fontSize: 22,
                  color: "#F0EEFF",
                  letterSpacing: "0.05em",
                }}
              >
                {name}
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <p
              style={{
                fontFamily: "var(--font-space-mono, monospace)",
                fontSize: "clamp(16px, 2vw, 22px)",
                color: "#00F5FF",
                letterSpacing: "0.05em",
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              Thanks to our mentors &amp; team
              <br />
              for making this possible
            </p>
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              style={{
                height: 2,
                background: "linear-gradient(90deg, transparent, #00F5FF, transparent)",
                marginTop: 24,
                transformOrigin: "center",
              }}
            />
          </motion.div>
        )}
      </div>
    </div>
  );
}
