"use client";

import Link from "next/link";
import { Users } from "lucide-react";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import SectionEyebrow from "@/components/home/SectionEyebrow";

const MANIFEST = [
  { k: "gde", v: "Google Developer Expert" },
  { k: "books", v: "4 published" },
  { k: "installs", v: "13M+" },
  { k: "talks", v: "50+" },
];

export default function CommunityHero() {
  const [discordCount, setDiscordCount] = useState(5000);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const count = data?.social?.discord?.count;
        if (typeof count === "number" && count > 0) setDiscordCount(count);
      })
      .catch(() => {});
  }, []);

  const fadeUp = shouldReduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
      };

  return (
    <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden border-b border-base-300">
      {/* Background Grid & Effects */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-base-100 via-transparent to-base-100"></div>

      {/* Single restrained glow behind the manifest */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[32rem] h-[32rem] bg-primary/10 rounded-full blur-[128px]"></div>

      <div className="relative z-[1] flex flex-col items-center text-center w-full px-4 sm:px-8 md:px-12 lg:px-16 py-24 space-y-8">
        {/* Community badge */}
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.4, delay: 0 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary-bright/40 bg-primary-bright/10 text-primary-bright"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-bright opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-bright"></span>
          </span>
          <div className="-mb-3 text-primary-bright">
            <SectionEyebrow tag="community-led" align="left">
              open to all developers
            </SectionEyebrow>
          </div>
        </motion.div>

        {/* Main heading */}
        <motion.h1
          {...fadeUp}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="text-5xl md:text-7xl font-bold tracking-tight leading-tight text-base-content max-w-4xl"
        >
          Join{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-bright via-base-content to-secondary">
            {discordCount.toLocaleString()}+
          </span>{" "}
          developers learning together
        </motion.h1>

        {/* Tagline */}
        <p className="text-xl text-base-content/70 max-w-2xl leading-relaxed">
          <strong className="text-base-content">Code With Ahsan</strong> is a mentor-led developer
          community where you learn from structured roadmaps, collaborate on real projects, and grow
          with the support of experienced engineers.
        </p>

        {/* Proof manifest */}
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="font-mono text-sm space-y-1.5 bg-base-200/50 border border-base-300 rounded-xl px-6 py-4"
        >
          {MANIFEST.map((row) => (
            <div key={row.k} className="flex items-baseline gap-2 justify-center sm:justify-start">
              <span className="text-base-content/50">{row.k}</span>
              <span className="text-base-content/30">:</span>
              <span className="text-primary-bright">{row.v}</span>
            </div>
          ))}
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 pt-2"
        >
          <a href="https://codewithahsan.dev/discord" target="_blank" rel="noopener noreferrer">
            <button className="btn btn-primary text-shadow-primary-content border-primary hover:bg-transparent hover:text-primary-content hidden md:inline-flex">
              <Users className="w-5 h-5 mr-2" />
              Join the community
            </button>
          </a>
          <a href="#newsletter">
            <button className="btn btn-outline text-shadow-primary-content border-primary hover:bg-primary hover:text-primary-content hidden md:inline-flex">
              Subscribe to the newsletter
            </button>
          </a>
          <Link href="/sponsors">
            <button className="btn btn-outline text-shadow-accent-content border-accent hover:bg-accent hover:text-accent-content hidden md:inline-flex">
              Sponsorships
            </button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
