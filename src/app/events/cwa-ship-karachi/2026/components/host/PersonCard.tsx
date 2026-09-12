"use client";

import { motion } from "framer-motion";
import { headingFont } from "../../constants";

const initialsOf = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

/**
 * The card used by the Mentors and Organisers slides, so the two read as one
 * pair. Initials sit underneath the photo: a couple of people have no headshot
 * yet, and hiding a broken img would leave a hole on stage — this way the
 * fallback needs no state.
 */
type Props = {
  name: string;
  /** Role line under the name. */
  role: string;
  /** Optional second line, e.g. the mentor's company. */
  detail?: string;
  avatarUrl: string;
  /** Stagger index for the entrance. */
  index: number;
  width?: number;
};

export default function PersonCard({ name, role, detail, avatarUrl, index, width = 190 }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, delay: 0.06 + index * 0.07, ease: [0.16, 1, 0.3, 1] }}
      style={{
        width,
        background: "rgba(108,43,217,0.07)",
        border: "1px solid rgba(108,43,217,0.35)",
        borderRadius: 12,
        padding: "22px 16px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <div
        style={{
          position: "relative",
          width: 84,
          height: 84,
          borderRadius: "50%",
          border: "2px solid rgba(108,43,217,0.7)",
          background: "linear-gradient(140deg, #6C2BD9 0%, #3B1470 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        <span
          aria-hidden
          style={{
            fontFamily: headingFont,
            fontSize: 30,
            letterSpacing: "0.04em",
            color: "#F0EEFF",
          }}
        >
          {initialsOf(name)}
        </span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarUrl}
          alt={name}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      </div>

      <div
        style={{
          fontFamily: headingFont,
          fontSize: 21,
          color: "#F0EEFF",
          letterSpacing: "0.04em",
          margin: "14px 0 6px",
          lineHeight: 1.15,
          textAlign: "center",
        }}
      >
        {name}
      </div>

      <div
        style={{
          fontFamily: "var(--font-space-mono, monospace)",
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "#00F5FF",
          textAlign: "center",
          lineHeight: 1.5,
        }}
      >
        {role}
      </div>

      {detail && (
        <div
          style={{
            fontFamily: "var(--font-space-mono, monospace)",
            fontSize: 10,
            letterSpacing: "0.1em",
            color: "rgba(240,238,255,0.45)",
            textAlign: "center",
            marginTop: 4,
            lineHeight: 1.5,
          }}
        >
          {detail}
        </div>
      )}
    </motion.div>
  );
}
