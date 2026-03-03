"use client";

const AnimatedBackground = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Dark base with slight purple tint */}
      <div className="absolute inset-0 bg-[#0c0a14]" />

      {/* Top-center purple ambient glow */}
      <div
        className="absolute w-[900px] h-[500px] rounded-full blur-[180px] opacity-[0.15]"
        style={{
          background: "radial-gradient(ellipse, #8f27e0 0%, transparent 70%)",
          top: "-10%",
          left: "50%",
          transform: "translateX(-50%)",
        }}
      />

      {/* Subtle top-left purple edge glow */}
      <div
        className="absolute w-[600px] h-[400px] rounded-full blur-[150px] opacity-[0.08]"
        style={{
          background: "#7b1fd4",
          top: "5%",
          left: "-10%",
        }}
      />

      {/* Subtle top-right purple edge glow */}
      <div
        className="absolute w-[500px] h-[350px] rounded-full blur-[140px] opacity-[0.06]"
        style={{
          background: "#9333ea",
          top: "10%",
          right: "-8%",
        }}
      />

      {/* Very faint bottom accent */}
      <div
        className="absolute w-[700px] h-[300px] rounded-full blur-[160px] opacity-[0.04]"
        style={{
          background: "#8f27e0",
          bottom: "-5%",
          left: "50%",
          transform: "translateX(-50%)",
        }}
      />

      {/* Subtle horizontal glow line near top */}
      <div
        className="absolute w-full h-px opacity-[0.06]"
        style={{
          background: "linear-gradient(90deg, transparent 10%, #8f27e0 50%, transparent 90%)",
          top: "8%",
        }}
      />
    </div>
  );
};

export default AnimatedBackground;
