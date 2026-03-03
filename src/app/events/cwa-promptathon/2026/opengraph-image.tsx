import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "CWA Prompt-a-thon 2026 - Generative AI Hackathon";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
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
            "radial-gradient(circle at 20% 20%, rgba(130,87,229,0.35) 0%, rgba(12,10,20,1) 45%), linear-gradient(135deg, #0c0a14 0%, #171321 100%)",
          color: "#f4f4f5",
          padding: "64px",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            border: "1px solid rgba(167,139,250,0.55)",
            borderRadius: "999px",
            padding: "10px 18px",
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: "#d8b4fe",
          }}
        >
          Code with Ahsan
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.05 }}>
            CWA Prompt-a-thon 2026
          </div>
          <div style={{ fontSize: 32, color: "#d4d4d8", lineHeight: 1.2 }}>
            1-Day Online Generative AI Hackathon
          </div>
        </div>

        <div style={{ display: "flex", gap: 20, fontSize: 26, color: "#c4b5fd" }}>
          <div>March 28, 2026</div>
          <div>|</div>
          <div>10:00 AM - 7:00 PM</div>
          <div>|</div>
          <div>50 Participants</div>
        </div>
      </div>
    ),
    size,
  );
}
