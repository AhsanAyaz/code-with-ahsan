"use client";

import { motion } from "framer-motion";
import { CalendarDays, FileText } from "lucide-react";
import { EVENT_MILESTONES, HACKATHON_THEMES } from "../constants";

const EventStructureSection = () => {
  return (
    <section className="py-16 sm:py-24 relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 max-w-6xl relative z-10">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-3">
            <FileText className="w-5 h-5 text-primary" />
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary">Event Structure</h2>
          </div>
          <p className="text-base-content/70 max-w-2xl mx-auto text-sm sm:text-base">
            Key timeline and themes for CWA Prompt-a-thon 2026.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {EVENT_MILESTONES.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="bg-base-200 border border-primary/15 rounded-xl p-5 shadow-[0_0_16px_rgba(143,39,224,0.1)]"
            >
              <div className="flex items-center gap-2 mb-2">
                <CalendarDays className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-base-content">{item.title}</h3>
              </div>
              <p className="text-xs sm:text-sm text-base-content/70">{item.dateTime}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {HACKATHON_THEMES.map((theme, index) => (
            <motion.div
              key={theme.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="bg-base-200 border border-primary/10 rounded-xl p-5"
            >
              <h3 className="text-base font-semibold text-primary mb-2">{theme.title}</h3>
              <p className="text-sm text-base-content/70 leading-relaxed">{theme.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default EventStructureSection;
