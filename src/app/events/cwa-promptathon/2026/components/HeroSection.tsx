"use client";

import { Calendar, Clock, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const CountdownUnit = ({ value, label }: { value: number; label: string }) => (
  <div className="flex flex-col items-center">
    <div className="bg-base-200 rounded-xl px-3 py-2 sm:px-4 sm:py-3 min-w-[56px] sm:min-w-[72px] shadow-lg border border-base-300">
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
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const target = new Date("2026-03-28T10:00:00").getTime();
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

  // Animation variants for staggered entrance
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
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Radial pulse rings - Further adjusted for subtlety */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.6], opacity: [0.02, 0] }} // Further reduced max scale and opacity
          transition={{ duration: 8, repeat: Infinity, ease: "easeOut" }} // Increased duration
          className="absolute w-64 h-64 rounded-full border border-primary/10" // Reduced border opacity
        />
        <motion.div
          animate={{ scale: [1, 1.6], opacity: [0.015, 0] }} // Further reduced max scale and opacity
          transition={{ duration: 8, repeat: Infinity, ease: "easeOut", delay: 2.5 }} // Increased duration
          className="absolute w-64 h-64 rounded-full border border-accent/10" // Reduced border opacity
        />
        <motion.div
          animate={{ scale: [1, 1.6], opacity: [0.01, 0] }} // Further reduced max scale and opacity
          transition={{ duration: 8, repeat: Infinity, ease: "easeOut", delay: 5 }} // Increased duration
          className="absolute w-64 h-64 rounded-full border border-primary/5" // Reduced border opacity
        />
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 container mx-auto px-4 sm:px-6 text-center"
      >
        <motion.div variants={itemVariants}>
          <span className="badge badge-primary badge-outline inline-flex items-center gap-2 px-4 py-2 mb-6 sm:mb-8 text-xs font-medium tracking-[0.15em] uppercase rounded-full font-mono">
            <Zap className="w-3.5 h-3.5" />
            Hackathon & Innovation Sprint
          </span>
        </motion.div>

        <motion.h1
          variants={itemVariants}
          className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-bold mb-4 sm:mb-6 leading-tight"
        >
          <span className="text-primary">CWA Prompt-a-thon</span>{" "}
          <span className="text-primary">
            2026
          </span>
        </motion.h1>

        <motion.p
          variants={itemVariants}
          className="text-base sm:text-lg md:text-xl text-base-content/70 mb-6 sm:mb-8 max-w-xl mx-auto"
        >
          Theme: <span className="text-base-content font-semibold">Generative AI, Build with AI</span>
        </motion.p>

        <motion.div
          variants={itemVariants}
          className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm text-base-content/70 mb-8 sm:mb-10"
        >
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <span>28th Mar, 2026</span>
          </div>
          <span className="hidden sm:inline text-base-300">•</span>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <span>10:00am – 7:00pm</span>
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

        <motion.div variants={itemVariants} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <a href="https://forms.gle/BdJ5bPZEeZoiMfi59" className="btn btn-primary btn-lg font-semibold rounded-xl transition-all duration-300 hover:scale-105 group relative overflow-hidden">
            <span className="relative z-10 flex items-center gap-2">
              <Zap className="w-4 h-4 group-hover:animate-pulse" />
              Register Now (10 Teams Maximum)
            </span>
          </a>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
