import { ImageResponse } from "next/og";
import { COLORS, EVENT } from "./constants";

export const runtime = "edge";
export const alt = EVENT.name;
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function TwitterImage() {
  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: `linear-gradient(145deg, ${COLORS.ink} 0%, ${COLORS.dusk} 55%, ${COLORS.ink} 100%)`,
        color: COLORS.paper,
        padding: "60px",
        fontFamily: "Inter, system-ui, sans-serif",
        borderBottom: `14px solid ${COLORS.amber}`,
      }}
    >
      <div style={{ display: "flex", fontSize: 28, color: COLORS.lilac, fontWeight: 700 }}>
        {`codewithahsan.dev${EVENT.path}`}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 88, fontWeight: 800, lineHeight: 1.02 }}>{EVENT.name}</div>
        <div style={{ fontSize: 38, color: COLORS.paper }}>Talks, panel and a live pitch final</div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 32 }}>
        <div style={{ display: "flex", width: 18, height: 18, background: COLORS.violet }} />
        <div style={{ color: COLORS.amber, fontWeight: 700 }}>Karachi, late March 2027</div>
      </div>
    </div>,
    size
  );
}
