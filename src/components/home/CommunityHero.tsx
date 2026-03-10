"use client";

import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";

export default function CommunityHero() {
  return (
    <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden border-b border-base-300">
      {/* Background Grid & Effects */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-base-100 via-transparent to-base-100"></div>

      {/* Animated Glow Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-[128px] animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px] animate-pulse delay-1000"></div>

      <div className="relative z-[1] flex flex-col items-center text-center w-full px-4 sm:px-8 md:px-12 lg:px-16 py-24 space-y-8">
        {/* Community badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-mono">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          Community-led learning — open to all developers
        </div>

        {/* Main heading */}
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight text-base-content max-w-4xl">
          Join{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-base-content to-secondary">
            4,500+ Developers
          </span>{" "}
          Learning Together
        </h1>

        {/* Tagline */}
        <p className="text-xl text-base-content/70 max-w-2xl leading-relaxed">
          <strong className="text-base-content">Code With Ahsan</strong> is a
          mentor-led developer community where you learn from structured
          roadmaps, collaborate on real projects, and grow with the support of
          experienced engineers.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 pt-2">
          <a
            href="https://discord.gg/codewithahsan"
            target="_blank"
            rel="noopener noreferrer"
          >
            <button className="btn btn-primary btn-lg w-full sm:w-auto">
              <Users className="w-5 h-5 mr-2" />
              Join the Community
            </button>
          </a>
          <Link href="/mentorship">
            <button className="btn btn-outline btn-lg w-full sm:w-auto">
              Explore Mentorship
              <ArrowRight className="w-5 h-5 ml-2" />
            </button>
          </Link>
        </div>

        {/* Supporting social proof */}
        <div className="pt-4 flex flex-wrap justify-center items-center gap-6 text-base-content/50 text-sm font-mono">
          <span>Mentor-led</span>
          <span className="hidden sm:inline text-base-content/20">|</span>
          <span>Real projects</span>
          <span className="hidden sm:inline text-base-content/20">|</span>
          <span>Structured roadmaps</span>
          <span className="hidden sm:inline text-base-content/20">|</span>
          <span>1-on-1 mentorship</span>
        </div>
      </div>
    </section>
  );
}
