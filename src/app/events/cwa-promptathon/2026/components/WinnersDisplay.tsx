"use client";

import { useEffect, useState } from "react";
import type { WinnersData, WinnerPlacement } from "@/types/events";

function PodiumCard({
  placement,
  data,
  accentColor,
  featured = false,
}: {
  placement: string;
  data: WinnerPlacement;
  height: string;
  accentColor: string;
  featured?: boolean;
}) {
  return (
    <div
      className={`flex-1 rounded-2xl p-6 flex flex-col gap-3 ${featured ? "max-w-sm" : "max-w-xs"}`}
      style={{
        background: "rgba(255,255,255,0.04)",
        border: `2px solid ${accentColor}`,
        boxShadow: `0 0 24px ${accentColor}40`,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-bebas, 'Bebas Neue', sans-serif)",
          fontSize: featured ? "2rem" : "1.5rem",
          color: accentColor,
        }}
      >
        {placement}
      </div>
      <div
        style={{
          fontFamily: "var(--font-bebas, 'Bebas Neue', sans-serif)",
          fontSize: featured ? "1.75rem" : "1.35rem",
          color: "#FFFFFF",
        }}
      >
        {data.teamName}
      </div>
      <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.875rem" }}>
        {data.projectDescription}
      </p>
      {data.judgeQuote && (
        <p
          style={{
            color: "#00F5FF",
            fontSize: "0.8rem",
            fontStyle: "italic",
            borderLeft: "2px solid #00F5FF",
            paddingLeft: "0.75rem",
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
    <section className="py-20 px-4" style={{ background: "#07020F" }}>
      {/* Section header */}
      <div className="max-w-5xl mx-auto text-center mb-12">
        <h2
          style={{
            fontFamily: "var(--font-bebas, 'Bebas Neue', sans-serif)",
            fontSize: "clamp(3rem, 6vw, 5rem)",
            color: "#FFD600",
            letterSpacing: "0.05em",
          }}
        >
          WINNERS
        </h2>
        <p
          style={{ color: "rgba(255,255,255,0.5)", fontFamily: "monospace" }}
        >
          CWA Prompt-A-Thon 2026
        </p>
      </div>
      {/* Podium: 2nd left, 1st center (larger), 3rd right */}
      <div className="max-w-5xl mx-auto flex items-end justify-center gap-4">
        {/* 2nd place */}
        <PodiumCard
          placement="2nd"
          data={winners.second}
          height="h-64"
          accentColor="#C0C0C0"
        />
        {/* 1st place — taller, center */}
        <PodiumCard
          placement="1st"
          data={winners.first}
          height="h-80"
          accentColor="#FFD600"
          featured
        />
        {/* 3rd place */}
        <PodiumCard
          placement="3rd"
          data={winners.third}
          height="h-56"
          accentColor="#CD7F32"
        />
      </div>
    </section>
  );
}
