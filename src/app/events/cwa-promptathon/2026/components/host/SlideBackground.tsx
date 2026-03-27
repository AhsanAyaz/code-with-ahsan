"use client";

interface SlideBackgroundProps {
  pulse?: boolean;
}

export default function SlideBackground({ pulse: _pulse }: SlideBackgroundProps) {
  return (
    <>
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: `linear-gradient(rgba(108,43,217,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(108,43,217,0.12) 1px, transparent 1px)`,
          backgroundSize: "50px 50px",
        }}
      />
      <div
        className="fixed inset-0 z-[1]"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 20%, rgba(7,2,15,0.9) 100%)",
        }}
      />
    </>
  );
}
