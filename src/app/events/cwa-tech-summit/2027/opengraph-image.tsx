import { ImageResponse } from "next/og";
import { COLORS, EVENT } from "./constants";

export const runtime = "edge";
export const alt = `${EVENT.name}: talks, panel and a live pitch final in Karachi`;
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: `radial-gradient(circle at 15% 10%, ${COLORS.violet}66 0%, ${COLORS.ink} 50%), linear-gradient(160deg, ${COLORS.ink} 0%, ${COLORS.dusk} 100%)`,
        color: COLORS.paper,
        padding: "64px",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <div style={{ display: "flex", fontSize: 28, color: COLORS.lilac }}>
        Code with Ahsan presents
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ fontSize: 92, fontWeight: 800, lineHeight: 1 }}>{EVENT.name}</div>
        <div style={{ display: "flex", width: 160, height: 8, background: COLORS.amber }} />
        <div style={{ fontSize: 40, color: COLORS.paper, lineHeight: 1.2 }}>
          Talks, panel and a live pitch final
        </div>
      </div>

      <div style={{ display: "flex", fontSize: 32, fontWeight: 700, color: COLORS.amber }}>
        Karachi, late March 2027
      </div>
    </div>,
    size
  );
}
