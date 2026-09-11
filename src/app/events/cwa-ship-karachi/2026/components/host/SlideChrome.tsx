"use client";

import { CWA_LOGO_SRC, DISCORD_QR_SRC } from "../../constants";

/**
 * Persistent deck furniture: the CWA mark and the community Discord QR.
 *
 * Rendered once in HostPanel, OUTSIDE the AnimatePresence that swaps slides, so
 * it stays put instead of re-animating on every advance — and so adding a slide
 * never means remembering to add the logo and QR to it.
 *
 * `showQr` is turned off on the closing slide, which shows its own full-size QR.
 */
export default function SlideChrome({ showQr = true }: { showQr?: boolean }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-40">
      {/* CWA mark — top left */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={CWA_LOGO_SRC}
        alt="Code With Ahsan"
        style={{
          position: "absolute",
          top: 28,
          left: 36,
          height: 44,
          width: "auto",
          opacity: 0.9,
          filter: "drop-shadow(0 0 14px rgba(108,43,217,0.45))",
        }}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />

      {/* Community QR — bottom right, on a white card so it scans off a projector */}
      {showQr && (
        <div
          style={{
            position: "absolute",
            right: 36,
            bottom: 92,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 12,
              padding: 8,
              lineHeight: 0,
              boxShadow: "0 0 24px rgba(108,43,217,0.35)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={DISCORD_QR_SRC}
              alt="Scan to join the Code With Ahsan Discord"
              style={{ width: 96, height: 96, display: "block" }}
            />
          </div>
          <span
            style={{
              fontFamily: "var(--font-space-mono, monospace)",
              fontSize: 10,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "rgba(240,238,255,0.55)",
            }}
          >
            Join the community
          </span>
        </div>
      )}
    </div>
  );
}
