"use client";

const SECTION_NAMES = [
  "Keynote",
  "Community",
  "Sponsors",
  "Judges",
  "Mentors",
  "Team Roll Call",
  "Themes",
  "Twist Reveal",
  "Send Off",
  "Winners",
  "Wrap Up",
];

const SECTION_HINTS = [
  "Space: next section",
  "Space: next section",
  "Space: next section",
  "Space: reveal next judge",
  "Space: next section",
  "Space: reveal next team",
  "Space: next section",
  "Space: start countdown",
  "Space: next section",
  "Space: reveal next placement",
  "Space: next section",
];

interface ControlBarProps {
  sectionIndex: number;
  sectionName: string;
  visible: boolean;
  onPrev: () => void;
  onNext: () => void;
}

export default function ControlBar({
  sectionIndex,
  sectionName,
  visible,
  onPrev,
  onNext,
}: ControlBarProps) {
  return (
    <div
      style={{
        display: visible ? "flex" : "none",
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: "rgba(7,2,15,0.85)",
        backdropFilter: "blur(12px)",
        borderTop: "1px solid rgba(108,43,217,0.4)",
        padding: "10px 24px",
        alignItems: "center",
        gap: 16,
        fontFamily: "var(--font-space-mono, monospace)",
      }}
    >
      <button
        onClick={onPrev}
        disabled={sectionIndex === 0}
        style={{
          background: "rgba(108,43,217,0.2)",
          border: "1px solid rgba(108,43,217,0.4)",
          borderRadius: 4,
          color: sectionIndex === 0 ? "rgba(240,238,255,0.2)" : "#F0EEFF",
          padding: "4px 12px",
          fontSize: 12,
          cursor: sectionIndex === 0 ? "not-allowed" : "pointer",
          fontFamily: "var(--font-space-mono, monospace)",
          letterSpacing: "0.05em",
        }}
      >
        [P] Prev
      </button>

      <div style={{ flex: 1, textAlign: "center" }}>
        <span
          style={{
            color: "#00F5FF",
            fontSize: 13,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {sectionName}
        </span>
        <span
          style={{
            color: "rgba(240,238,255,0.3)",
            fontSize: 11,
            marginLeft: 16,
            letterSpacing: "0.06em",
          }}
        >
          {SECTION_HINTS[sectionIndex]}
        </span>
      </div>

      <div
        style={{
          color: "rgba(240,238,255,0.3)",
          fontSize: 11,
          letterSpacing: "0.06em",
        }}
      >
        ←/→ sections · [H] toggle · [F] fullscreen
      </div>

      <button
        onClick={onNext}
        disabled={sectionIndex === 9}
        style={{
          background: "rgba(108,43,217,0.2)",
          border: "1px solid rgba(108,43,217,0.4)",
          borderRadius: 4,
          color: sectionIndex === 9 ? "rgba(240,238,255,0.2)" : "#F0EEFF",
          padding: "4px 12px",
          fontSize: 12,
          cursor: sectionIndex === 9 ? "not-allowed" : "pointer",
          fontFamily: "var(--font-space-mono, monospace)",
          letterSpacing: "0.05em",
        }}
      >
        [N] Next
      </button>
    </div>
  );
}

export { SECTION_NAMES };
