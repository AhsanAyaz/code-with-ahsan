"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import SlideBackground from "../SlideBackground";
import { CONFIRMED_SPONSORS, headingFont } from "../../../constants";

export default function SponsorsSection() {
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
            fontFamily: headingFont,
            fontSize: "clamp(48px, 7vw, 88px)",
            color: "#F0EEFF",
            letterSpacing: "0.06em",
            margin: "0 0 16px 0",
          }}
        >
          Our Sponsors
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{
            fontFamily: "var(--font-space-mono, monospace)",
            fontSize: 13,
            color: "rgba(240,238,255,0.4)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            margin: "0 0 48px 0",
          }}
        >
          Powering the hackathon
        </motion.p>

        <div
          style={{
            display: "flex",
            gap: 32,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          {CONFIRMED_SPONSORS.map((sponsor, i) => (
            <motion.a
              key={sponsor.name}
              href={sponsor.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: 0.15 + i * 0.12,
                ease: [0.16, 1, 0.3, 1],
              }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 16,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(108,43,217,0.3)",
                borderRadius: 12,
                padding: "32px 40px",
                textDecoration: "none",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: 140,
                  height: 70,
                }}
              >
                <Image
                  src={sponsor.logoUrl}
                  alt={sponsor.name}
                  fill
                  style={{ objectFit: "contain" }}
                />
              </div>
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-space-mono, monospace)",
                    fontSize: 12,
                    color: "#FFD600",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    textAlign: "center",
                  }}
                >
                  {sponsor.tier}
                </div>
                <div
                  style={{
                    fontFamily: headingFont,
                    fontSize: 22,
                    color: "#F0EEFF",
                    letterSpacing: "0.06em",
                    textAlign: "center",
                    marginTop: 4,
                  }}
                >
                  {sponsor.name}
                </div>
              </div>
            </motion.a>
          ))}
        </div>
      </div>
    </div>
  );
}
