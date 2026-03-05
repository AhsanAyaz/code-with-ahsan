"use client";

import { motion } from "framer-motion";
import { Code2 } from "lucide-react";

const AboutSection = () => {
  return (
    <section className="relative py-16 sm:py-24 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 max-w-3xl relative z-10">
        <div
          className="bg-base-200 rounded-2xl p-6 sm:p-10 relative overflow-hidden shadow-[0_0_25px_rgba(143,39,224,0.1)] border border-primary/15"
        >
          {/* Corner decoration */}
          <div className="absolute top-0 right-0 w-20 h-20 border-t border-r border-primary/20 rounded-tr-2xl" />
          <div className="absolute bottom-0 left-0 w-20 h-20 border-b border-l border-primary/20 rounded-bl-2xl" />

          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Code2 className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary">
              What is Prompt-a-thon 2026?
            </h2>
          </div>

          <p className="text-base-content/70 leading-relaxed text-base sm:text-lg mb-5">
            The <span className="text-base-content font-semibold">Code With Ahsan Prompt-a-thon 2026</span> is a
            one-day online hackathon where teams build and demo practical AI apps under a fixed sprint timeline.
          </p>
          <p className="text-base-content/70 leading-relaxed text-sm sm:text-base">
            It is focused on{" "}
            <span className="text-accent font-semibold">
              Generative AI & #BuildWithAI
            </span>
            , with 50 participants, 10 teams, mentor support, and a same-day judging cycle.
          </p>

          {/* Terminal-style decoration */}
          <div className="mt-6 p-3 rounded-lg bg-base-300 font-mono text-xs text-base-content/70">
            <span className="text-primary">$</span> build
            --theme=&quot;generative-ai&quot; --mode=&quot;hackathon&quot;
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              className="text-primary ml-1"
            >
              █
            </motion.span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
