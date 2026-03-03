import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "CWA Prompt-a-thon 2026";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "linear-gradient(145deg, #0c0a14 0%, #21123a 40%, #120f1c 100%)",
          color: "#fafafa",
          padding: "60px",
          fontFamily: "Inter, system-ui, sans-serif",
          border: "2px solid rgba(167,139,250,0.3)",
        }}
      >
        <div style={{ fontSize: 28, color: "#c4b5fd", fontWeight: 700 }}>
          codewithahsan.dev/events/cwa-promptathon/2026
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.04 }}>
            CWA Prompt-a-thon 2026
          </div>
          <div style={{ fontSize: 34, color: "#e4e4e7" }}>
            Generative AI | Open Stack | 10 Teams
          </div>
        </div>

        <div style={{ fontSize: 30, color: "#d8b4fe", fontWeight: 700 }}>
          March 28, 2026 • Online
        </div>
      </div>
    ),
    size,
  );
}
