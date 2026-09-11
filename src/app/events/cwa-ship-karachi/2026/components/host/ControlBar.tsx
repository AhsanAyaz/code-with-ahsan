"use client";

const SECTION_NAMES = [
  "Welcome",
  "Sponsors",
  "Vision & Founder",
  "Our Programs",
  "Judges",
  "Mentors",
  "Organising Team",
  "MSA Karachi",
  "Team Roll Call",
  "Theme Reveal",
  "Judging Criteria",
  "Rules",
  "Disqualification",
  "Phase 1",
  "Lunch Break",
  "Phase 2",
  "Submissions",
  "Presentations",
  "Winners",
  "Prizes & Perks",
  "Wrap Up",
];

const NEXT_SLIDE = "Space: next slide";
const TIMER_HINT = "Space: next · T: start/pause · R: reset";

const SECTION_HINTS = [
  NEXT_SLIDE,
  NEXT_SLIDE,
  NEXT_SLIDE,
  NEXT_SLIDE,
  "Space: reveal next judge",
  NEXT_SLIDE,
  NEXT_SLIDE,
  NEXT_SLIDE,
  "Space: reveal next team",
  NEXT_SLIDE,
  NEXT_SLIDE,
  NEXT_SLIDE,
  NEXT_SLIDE,
  "Space: start countdown · T: timer · R: re-arm",
  TIMER_HINT,
  TIMER_HINT,
  TIMER_HINT,
  TIMER_HINT,
  "Space: reveal next placement",
  NEXT_SLIDE,
  NEXT_SLIDE,
];

/** Index of the final slide — the Next button is disabled here. */
const LAST_SLIDE = SECTION_NAMES.length - 1;

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
        ←/→ slides · [H] toggle · [F] fullscreen · [T] timer · [R] reset
      </div>

      <button
        onClick={onNext}
        disabled={sectionIndex === LAST_SLIDE}
        style={{
          background: "rgba(108,43,217,0.2)",
          border: "1px solid rgba(108,43,217,0.4)",
          borderRadius: 4,
          color: sectionIndex === LAST_SLIDE ? "rgba(240,238,255,0.2)" : "#F0EEFF",
          padding: "4px 12px",
          fontSize: 12,
          cursor: sectionIndex === LAST_SLIDE ? "not-allowed" : "pointer",
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
