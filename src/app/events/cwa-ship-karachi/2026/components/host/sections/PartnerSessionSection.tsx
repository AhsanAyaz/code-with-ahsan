"use client";

import { motion } from "framer-motion";
import SlideShell from "../SlideShell";
import { MSA_SESSION, headingFont } from "../../../constants";

export default function PartnerSessionSection() {
  return (
    <SlideShell eyebrow={`Collaboration partner · ${MSA_SESSION.window}`} title={MSA_SESSION.title}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 44,
          background: "rgba(108,43,217,0.07)",
          border: "1px solid rgba(108,43,217,0.4)",
          borderRadius: 16,
          padding: "40px 48px",
          textAlign: "left",
        }}
      >
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: 14,
            padding: 18,
            flexShrink: 0,
            lineHeight: 0,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={MSA_SESSION.logoUrl}
            alt={`${MSA_SESSION.organization} logo`}
            style={{ width: 150, height: 150, objectFit: "contain", display: "block" }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.visibility = "hidden";
            }}
          />
        </div>

        <div>
          <div
            style={{
              fontFamily: "var(--font-space-mono, monospace)",
              fontSize: 11,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#FFD600",
              marginBottom: 10,
            }}
          >
            Presented by {MSA_SESSION.presenter}
          </div>
          <h3
            style={{
              fontFamily: headingFont,
              fontSize: 44,
              color: "#F0EEFF",
              letterSpacing: "0.05em",
              margin: "0 0 16px",
              lineHeight: 1.1,
            }}
          >
            {MSA_SESSION.organization}
          </h3>
          <p
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 16,
              lineHeight: 1.7,
              color: "rgba(240,238,255,0.7)",
              margin: 0,
            }}
          >
            {MSA_SESSION.description}
          </p>
        </div>
      </motion.div>
    </SlideShell>
  );
}
