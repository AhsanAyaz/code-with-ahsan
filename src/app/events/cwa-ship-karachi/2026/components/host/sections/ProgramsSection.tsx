"use client";

import { motion } from "framer-motion";
import SlideShell from "../SlideShell";
import { COMMUNITY_PROGRAMS, COMMUNITY_STATS, PAST_EVENTS, headingFont } from "../../../constants";

type ListProps = {
  heading: string;
  accent: string;
  items: string[];
  delayOffset: number;
};

const List = ({ heading, accent, items, delayOffset }: ListProps) => (
  <div
    style={{
      flex: 1,
      background: "rgba(108,43,217,0.06)",
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
        fontSize: 30,
        color: accent,
        letterSpacing: "0.05em",
        margin: "0 0 16px",
        lineHeight: 1.1,
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
          transition={{ duration: 0.4, delay: delayOffset + i * 0.07, ease: [0.16, 1, 0.3, 1] }}
          style={{
            display: "flex",
            gap: 12,
            alignItems: "baseline",
            padding: "11px 0",
            borderBottom: "1px solid rgba(108,43,217,0.18)",
            fontFamily: "Inter, sans-serif",
            fontSize: 16,
            lineHeight: 1.45,
            color: "rgba(240,238,255,0.78)",
          }}
        >
          <span aria-hidden style={{ color: accent, flexShrink: 0 }}>
            ▸
          </span>
          {item}
        </motion.li>
      ))}
    </ul>
  </div>
);

export default function ProgramsSection() {
  return (
    <SlideShell eyebrow="Code With Ahsan" title="Our Community" maxWidth={1240}>
      <div style={{ display: "flex", gap: 22, alignItems: "stretch" }}>
        <List heading="What We Run" accent="#00F5FF" items={COMMUNITY_PROGRAMS} delayOffset={0.1} />
        <List
          heading="Events We've Organised"
          accent="#FFD600"
          items={PAST_EVENTS}
          delayOffset={0.18}
        />
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 52,
          marginTop: 28,
          paddingTop: 22,
          borderTop: "1px solid rgba(108,43,217,0.28)",
        }}
      >
        {COMMUNITY_STATS.slice(0, 4).map((stat) => (
          <div key={stat.label} style={{ textAlign: "center" }}>
            <div
              style={{
                fontFamily: headingFont,
                fontSize: 38,
                color: "#00F5FF",
                letterSpacing: "0.04em",
                lineHeight: 1,
              }}
            >
              {stat.value}
            </div>
            <div
              style={{
                fontFamily: "var(--font-space-mono, monospace)",
                fontSize: 10,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "rgba(240,238,255,0.45)",
                marginTop: 8,
                maxWidth: 160,
              }}
            >
              {stat.label}
            </div>
          </div>
        ))}
      </motion.div>
    </SlideShell>
  );
}
