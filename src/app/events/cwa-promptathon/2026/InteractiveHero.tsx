"use client";
import React, { useRef, useEffect, useState } from "react";
import { useTheme } from "next-themes";

export default function InteractiveHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const { resolvedTheme } = useTheme();

  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      setMousePos({ x, y });
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("mousemove", handleMouseMove);
    }
    return () => {
      if (container) {
        container.removeEventListener("mousemove", handleMouseMove);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden rounded-xl border-2 flex items-center justify-center p-8 min-h-[400px] md:min-h-[500px] transition-colors duration-300 ${isDark ? "bg-gray-900 border-gray-800" : "bg-indigo-50 border-indigo-100"}`}
    >
      {/* Dynamic Background SVG with Parallax */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none opacity-60"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="glow" cx="50%" cy="50%" r="50%">
            <stop
              offset="0%"
              stopColor={isDark ? "#4f46e5" : "#6366f1"}
              stopOpacity="0.4"
            />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Glow tracking cursor */}
        <circle
          cx={`${50 + mousePos.x * 20}%`}
          cy={`${50 + mousePos.y * 20}%`}
          r="40%"
          fill="url(#glow)"
          className="transition-all duration-300 ease-out"
        />

        {/* Floating AI Nodes */}
        <g
          stroke={isDark ? "#818cf8" : "#4f46e5"}
          strokeWidth="2"
          fill={isDark ? "#1e1b4b" : "#e0e7ff"}
          className="transition-transform duration-200"
        >
          <circle
            style={{
              transform: `translate(${mousePos.x * -30}px, ${mousePos.y * -30}px)`,
            }}
            cx="20%"
            cy="30%"
            r="15"
          />
          <circle
            style={{
              transform: `translate(${mousePos.x * 40}px, ${mousePos.y * 10}px)`,
            }}
            cx="80%"
            cy="20%"
            r="20"
          />
          <circle
            style={{
              transform: `translate(${mousePos.x * 20}px, ${mousePos.y * 50}px)`,
            }}
            cx="70%"
            cy="80%"
            r="12"
          />
          <circle
            style={{
              transform: `translate(${mousePos.x * -10}px, ${mousePos.y * -40}px)`,
            }}
            cx="30%"
            cy="75%"
            r="25"
          />
        </g>

        {/* Connecting Lines */}
        <g
          stroke={isDark ? "#4338ca" : "#818cf8"}
          strokeWidth="1"
          strokeDasharray="4 4"
          opacity="0.5"
        >
          <line
            x1="20%"
            y1="30%"
            x2="80%"
            y2="20%"
            style={{
              transform: `translate(${mousePos.x * 5}px, ${mousePos.y * -10}px)`,
            }}
          />
          <line
            x1="80%"
            y1="20%"
            x2="70%"
            y2="80%"
            style={{
              transform: `translate(${mousePos.x * 30}px, ${mousePos.y * 30}px)`,
            }}
          />
          <line
            x1="70%"
            y1="80%"
            x2="30%"
            y2="75%"
            style={{
              transform: `translate(${mousePos.x * 5}px, ${mousePos.y * 5}px)`,
            }}
          />
          <line
            x1="30%"
            y1="75%"
            x2="20%"
            y2="30%"
            style={{
              transform: `translate(${mousePos.x * -20}px, ${mousePos.y * -5}px)`,
            }}
          />
        </g>
      </svg>

      {/* Hero Content */}
      <div className="z-10 flex flex-col items-center text-center max-w-3xl space-y-6">
        <div className="inline-block px-4 py-1.5 rounded-full text-sm font-semibold tracking-wider uppercase bg-primary-50 text-primary-600 border border-primary-200 shadow-sm">
          Hackathon & Innovation Sprint
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-primary-400 drop-shadow-sm">
          CWA Prompt-a-thon 2026
        </h1>
        <p className="text-xl md:text-2xl font-light text-gray-700 dark:text-gray-300">
          Theme:{" "}
          <span className="font-semibold text-primary-600 dark:text-primary-400">
            Generative AI, Build with AI
          </span>
        </p>
        <div className="flex flex-col sm:flex-row gap-4 items-center mt-4 text-gray-600 dark:text-gray-400 font-medium">
          <div className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                clipRule="evenodd"
              />
            </svg>
            28th Mar, 2026
          </div>
          <div className="hidden sm:block">•</div>
          <div className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                clipRule="evenodd"
              />
            </svg>
            10:00am - 7:00pm
          </div>
        </div>
      </div>
    </div>
  );
}
