"use client";

import { Calendar, Clock, MapPin, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { EVENT, SECTION_IDS } from "../constants";

const CountdownUnit = ({ value, label }: { value: number; label: string }) => (
  <div className="flex flex-col items-center">
    <div className="bg-base-200 rounded-xl px-3 py-2 sm:px-4 sm:py-3 min-w-[56px] sm:min-w-[72px] shadow-[0_0_12px_rgba(143,39,224,0.15)] border border-primary/20">
      <span className="text-xl sm:text-3xl font-bold font-mono text-primary">
        {String(value).padStart(2, "0")}
      </span>
    </div>
    <span className="text-[10px] sm:text-xs text-base-content/70 mt-1.5 uppercase tracking-wider font-mono">
      {label}
    </span>
  </div>
);

const HeroSection = () => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const target = new Date(EVENT.isoStart).getTime();
    const update = () => {
      const diff = Math.max(0, target - Date.now());
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  // Scroll to the sponsorship section rather than navigating away. The href is
  // kept so the control still works without JS and remains a real link.
  const scrollToSponsorship = useCallback((event: React.MouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById(SECTION_IDS.sponsorshipPackages);
    if (!target) return;
    event.preventDefault();
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start",
    });
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <section className="relative min-h-[85vh] sm:min-h-[90vh] flex items-center justify-center overflow-hidden pt-16 pb-8">
      {/* Radial pulse rings */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.6], opacity: [0.02, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeOut" }}
          className="absolute w-64 h-64 rounded-full border border-primary/10"
        />
        <motion.div
          animate={{ scale: [1, 1.6], opacity: [0.015, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeOut", delay: 2.5 }}
          className="absolute w-64 h-64 rounded-full border border-accent/10"
        />
        <motion.div
          animate={{ scale: [1, 1.6], opacity: [0.01, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeOut", delay: 5 }}
          className="absolute w-64 h-64 rounded-full border border-primary/5"
        />
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 container mx-auto px-4 sm:px-6 text-center"
      >
        <motion.div variants={itemVariants}>
          <span className="badge badge-primary inline-flex w-fit h-auto mx-auto items-center justify-center gap-2 px-4 py-2.5 sm:px-7 sm:py-4 mb-6 sm:mb-8 text-xs sm:text-lg text-primary-content font-semibold tracking-[0.05em] sm:tracking-[0.16em] uppercase rounded-full font-mono shadow-[0_0_18px_rgba(143,39,224,0.4)] max-w-[92vw] whitespace-normal text-center leading-tight">
            <Zap className="w-4 h-4 sm:w-6 sm:h-6 shrink-0" />
            {EVENT.kicker} · On-site
          </span>
        </motion.div>

        <motion.h1
          variants={itemVariants}
          className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-4 sm:mb-6 leading-tight md:whitespace-nowrap"
        >
          <span className="text-primary">CWA</span>{" "}
          <span className="text-primary whitespace-nowrap">Ship Karachi</span>{" "}
          <span className="text-primary">2026</span>
        </motion.h1>

        <motion.p
          variants={itemVariants}
          className="text-base sm:text-lg md:text-xl text-base-content/70 mb-5 sm:mb-6 max-w-xl mx-auto"
        >
          {EVENT.tagline}{" "}
          <span className="text-base-content font-semibold">
            A full-day hackathon. Build and Ship AI Product.
          </span>
        </motion.p>

        <motion.div
          variants={itemVariants}
          className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm text-base-content/70 mb-8 sm:mb-10"
        >
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <span>{EVENT.dateLabel}</span>
          </div>
          <span className="hidden sm:inline text-base-300">•</span>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <span>{EVENT.timeLabel}</span>
          </div>
          <span className="hidden sm:inline text-base-300">•</span>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            <span>{EVENT.locationShort}</span>
          </div>
        </motion.div>

        {/* Countdown */}
        <motion.div
          variants={itemVariants}
          className="flex items-center justify-center gap-2 sm:gap-3 mb-10 sm:mb-12"
        >
          <CountdownUnit value={timeLeft.days} label="Days" />
          <span className="text-primary/50 text-xl font-bold mt-[-20px]">:</span>
          <CountdownUnit value={timeLeft.hours} label="Hours" />
          <span className="text-primary/50 text-xl font-bold mt-[-20px]">:</span>
          <CountdownUnit value={timeLeft.minutes} label="Min" />
          <span className="text-primary/50 text-xl font-bold mt-[-20px]">:</span>
          <CountdownUnit value={timeLeft.seconds} label="Sec" />
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <a
            href={EVENT.registerUrl}
            className="btn btn-primary btn-lg font-semibold rounded-xl transition-all duration-300 hover:scale-105 group relative overflow-hidden shadow-[0_0_20px_rgba(143,39,224,0.4)] hover:shadow-[0_0_30px_rgba(143,39,224,0.5)]"
          >
            <span className="relative z-10 flex items-center gap-2">
              <Zap className="w-4 h-4 group-hover:animate-pulse" />
              Register Now
            </span>
          </a>
          <a
            href={`#${SECTION_IDS.sponsorshipPackages}`}
            onClick={scrollToSponsorship}
            className="btn btn-outline btn-primary btn-lg rounded-xl"
          >
            Become a Sponsor
          </a>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
