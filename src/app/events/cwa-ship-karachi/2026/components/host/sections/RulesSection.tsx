"use client";

import { motion } from "framer-motion";
import SlideShell from "../SlideShell";
import { ALLOWED, NOT_ALLOWED, headingFont } from "../../../constants";

type ColumnProps = {
  heading: string;
  mark: string;
  accent: string;
  items: string[];
  delayOffset: number;
};

const Column = ({ heading, mark, accent, items, delayOffset }: ColumnProps) => (
  <div
    style={{
      flex: 1,
      background: "rgba(108,43,217,0.05)",
      border: `1px solid ${accent}44`,
      borderTop: `3px solid ${accent}`,
      borderRadius: 12,
      padding: "24px 28px",
      textAlign: "left",
    }}
  >
    <h3
      style={{
        fontFamily: headingFont,
        fontSize: 32,
        color: accent,
        letterSpacing: "0.06em",
        margin: "0 0 16px",
      }}
    >
      {heading}
    </h3>
    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {items.map((item, i) => (
        <motion.li
          key={item}
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.38, delay: delayOffset + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
          style={{
            display: "flex",
            gap: 12,
            alignItems: "baseline",
            padding: "9px 0",
            borderBottom: "1px solid rgba(108,43,217,0.18)",
            fontFamily: "Inter, sans-serif",
            fontSize: 15.5,
            lineHeight: 1.5,
            color: "rgba(240,238,255,0.76)",
          }}
        >
          <span aria-hidden style={{ color: accent, flexShrink: 0, fontSize: 15 }}>
            {mark}
          </span>
          {item}
        </motion.li>
      ))}
    </ul>
  </div>
);

export default function RulesSection() {
  return (
    <SlideShell eyebrow="Read this before you start" title="Rules" maxWidth={1280}>
      <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
        <Column heading="Allowed" mark="✓" accent="#00F5FF" items={ALLOWED} delayOffset={0.1} />
        <Column
          heading="Not Allowed"
          mark="✕"
          accent="#FF3B6B"
          items={NOT_ALLOWED}
          delayOffset={0.18}
        />
      </div>
    </SlideShell>
  );
}
