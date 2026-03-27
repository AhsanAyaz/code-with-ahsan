"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { ExternalLink } from "lucide-react";
import SlideBackground from "../SlideBackground";
import { JUDGES, headingFont } from "../../../constants";

interface JudgesSectionProps {
  revealedCount: number;
}

export default function JudgesSection({ revealedCount }: JudgesSectionProps) {
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
            margin: "0 0 12px 0",
          }}
        >
          Our Judges
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{
            fontFamily: "var(--font-space-mono, monospace)",
            fontSize: 12,
            color: "rgba(240,238,255,0.4)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            margin: "0 0 40px 0",
          }}
        >
          {revealedCount}/{JUDGES.length} revealed — press Space to reveal next
        </motion.p>

        <div
          style={{
            display: "flex",
            gap: 24,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          {JUDGES.map((judge, i) => (
            <AnimatePresence key={judge.name}>
              {i < revealedCount && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    background: "rgba(108,43,217,0.08)",
                    border: "1px solid rgba(108,43,217,0.35)",
                    borderRadius: 12,
                    padding: "24px 20px",
                    width: 200,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      position: "relative",
                      width: 80,
                      height: 80,
                      borderRadius: "50%",
                      overflow: "hidden",
                      border: "2px solid #6C2BD9",
                    }}
                  >
                    <Image
                      src={judge.avatarUrl}
                      alt={judge.name}
                      fill
                      style={{ objectFit: "cover" }}
                    />
                  </div>
                  <div>
                    <div
                      style={{
                        fontFamily:
                          headingFont,
                        fontSize: 22,
                        color: "#F0EEFF",
                        letterSpacing: "0.06em",
                        textAlign: "center",
                      }}
                    >
                      {judge.name}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-space-mono, monospace)",
                        fontSize: 10,
                        color: "rgba(240,238,255,0.5)",
                        textAlign: "center",
                        marginTop: 4,
                        lineHeight: 1.4,
                      }}
                    >
                      {judge.title}
                    </div>
                  </div>
                  <div
                    style={{
                      background: "rgba(0,245,255,0.1)",
                      border: "1px solid rgba(0,245,255,0.25)",
                      borderRadius: 4,
                      padding: "3px 10px",
                      fontFamily: "var(--font-space-mono, monospace)",
                      fontSize: 10,
                      color: "#00F5FF",
                      letterSpacing: "0.08em",
                    }}
                  >
                    {judge.experience}
                  </div>
                  <a
                    href={judge.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: "rgba(240,238,255,0.4)",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 11,
                      textDecoration: "none",
                      fontFamily: "var(--font-space-mono, monospace)",
                    }}
                  >
                    <ExternalLink size={12} />
                    LinkedIn
                  </a>
                </motion.div>
              )}
            </AnimatePresence>
          ))}
        </div>
      </div>
    </div>
  );
}
