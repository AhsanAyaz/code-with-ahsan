"use client";

import { useEffect, useState } from "react";
import type { WinnersData, WinnerPlacement } from "@/types/events";
import { headingFont } from "../constants";

const MEDAL_CONFIG = {
  first: { label: "1st Place", color: "#FFD600", glow: "#FFD60066", trophy: "🥇", order: 1 },
  second: { label: "2nd Place", color: "#C0C0C0", glow: "#C0C0C044", trophy: "🥈", order: 2 },
  third: { label: "3rd Place", color: "#CD7F32", glow: "#CD7F3244", trophy: "🥉", order: 3 },
} as const;

function WinnerCard({
  placement,
  data,
  featured,
}: {
  placement: keyof typeof MEDAL_CONFIG;
  data: WinnerPlacement;
  featured?: boolean;
}) {
  const cfg = MEDAL_CONFIG[placement];
  return (
    <div
      style={{
        flex: featured ? "0 0 auto" : "0 0 auto",
        width: featured ? "min(380px, 100%)" : "min(300px, 100%)",
        borderRadius: "1.25rem",
        border: `2px solid ${cfg.color}`,
        boxShadow: `0 0 40px ${cfg.glow}, inset 0 0 40px rgba(0,0,0,0.4)`,
        background: "linear-gradient(160deg, rgba(30,12,60,0.95) 0%, rgba(10,5,25,0.98) 100%)",
        padding: featured ? "2rem" : "1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
      }}
    >
      {/* Trophy + placement */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span style={{ fontSize: featured ? "2.5rem" : "2rem" }}>{cfg.trophy}</span>
        <span
          style={{
            fontFamily: headingFont,
            fontSize: featured ? "1.75rem" : "1.4rem",
            color: cfg.color,
            letterSpacing: "0.05em",
          }}
        >
          {cfg.label}
        </span>
      </div>

      {/* Team name */}
      <div
        style={{
          fontFamily: headingFont,
          fontSize: featured ? "2rem" : "1.6rem",
          color: "#FFFFFF",
          letterSpacing: "0.03em",
          lineHeight: 1.1,
        }}
      >
        Team {data.teamName}
      </div>

      {/* Divider */}
      <div
        style={{
          height: "1px",
          background: `linear-gradient(90deg, ${cfg.color}88, transparent)`,
        }}
      />

      {/* Project description */}
      <p
        style={{
          color: "rgba(255,255,255,0.75)",
          fontSize: "0.875rem",
          lineHeight: 1.6,
          margin: 0,
        }}
      >
        {data.projectDescription}
      </p>

      {/* Judge quote */}
      {data.judgeQuote && (
        <p
          style={{
            color: "#00F5FF",
            fontSize: "0.8rem",
            fontStyle: "italic",
            borderLeft: `3px solid ${cfg.color}`,
            paddingLeft: "0.75rem",
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          &ldquo;{data.judgeQuote}&rdquo;
        </p>
      )}
    </div>
  );
}

export default function WinnersDisplay() {
  const [winners, setWinners] = useState<WinnersData | null>(null);

  useEffect(() => {
    fetch("/api/admin/events/cwa-promptathon-2026/winners")
      .then((res) => res.json())
      .then((data: WinnersData | null) => {
        if (data?.announcedAt) setWinners(data);
      })
      .catch(() => {
        /* silent — winners not yet announced */
      });
  }, []);

  if (!winners) return null;

  return (
    <section
      style={{
        position: "relative",
        zIndex: 10,
        background: "linear-gradient(180deg, #07020F 0%, #0d0520 50%, #07020F 100%)",
        borderTop: "1px solid rgba(108,43,217,0.4)",
        padding: "5rem 1rem",
      }}
    >
      {/* Ambient glow behind heading */}
      <div
        style={{
          position: "absolute",
          top: "0",
          left: "50%",
          transform: "translateX(-50%)",
          width: "600px",
          height: "300px",
          background: "radial-gradient(ellipse, rgba(255,214,0,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ maxWidth: "1100px", margin: "0 auto", position: "relative" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <p
            style={{
              color: "rgba(255,255,255,0.4)",
              fontFamily: "monospace",
              fontSize: "0.8rem",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              marginBottom: "0.5rem",
            }}
          >
            CWA Prompt-A-Thon 2026
          </p>
          <h2
            style={{
              fontFamily: headingFont,
              fontSize: "clamp(3.5rem, 8vw, 6rem)",
              color: "#FFD600",
              letterSpacing: "0.06em",
              lineHeight: 1,
              margin: 0,
              textShadow: "0 0 60px rgba(255,214,0,0.4)",
            }}
          >
            WINNERS
          </h2>
          <div
            style={{
              width: "120px",
              height: "3px",
              background: "linear-gradient(90deg, transparent, #FFD600, transparent)",
              margin: "1rem auto 0",
            }}
          />
        </div>

        {/* Cards — 1st on top on mobile, side by side on desktop */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "1.5rem",
            justifyContent: "center",
            alignItems: "flex-start",
          }}
        >
          {/* 2nd place */}
          <WinnerCard placement="second" data={winners.second} />
          {/* 1st place — center, featured */}
          <WinnerCard placement="first" data={winners.first} featured />
          {/* 3rd place */}
          <WinnerCard placement="third" data={winners.third} />
        </div>

        {/* Footer timestamp */}
        <p
          style={{
            textAlign: "center",
            color: "rgba(255,255,255,0.25)",
            fontFamily: "monospace",
            fontSize: "0.75rem",
            marginTop: "2.5rem",
          }}
        >
          Announced {new Date(winners.announcedAt!).toLocaleString()}
        </p>
      </div>
    </section>
  );
}
