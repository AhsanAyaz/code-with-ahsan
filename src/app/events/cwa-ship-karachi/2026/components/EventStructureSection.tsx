"use client";

import { motion } from "framer-motion";
import { FileText, Lightbulb } from "lucide-react";
import { HACKATHON_THEMES } from "../constants";

const EventStructureSection = () => {
  return (
    <section className="py-16 sm:py-24 relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 max-w-6xl relative z-10">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Lightbulb className="w-5 h-5 text-primary" />
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary">
              Hackathon Themes
            </h2>
          </div>
          <p className="text-base-content/70 max-w-2xl mx-auto text-sm sm:text-base">
            Build tracks for the hackathon. Pick one and ship a working demo by the end of the day.
          </p>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} className="mt-4">
            <a
              href="https://docs.google.com/document/d/1eBNSVF1H1EJlLH6DdW0fzM7uCE8-Z_qtrspJY5Xd00o/edit?usp=sharing"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline btn-primary btn-md rounded-xl gap-2 shadow-[0_0_18px_rgba(143,39,224,0.25)] hover:shadow-[0_0_28px_rgba(143,39,224,0.45)] transition-shadow duration-300"
            >
              <FileText className="w-4 h-4" />
              View Event Structure Document
            </a>
          </motion.div>
        </div>

        <div className="flex flex-wrap items-stretch justify-center gap-4">
          {HACKATHON_THEMES.map((theme, index) => (
            <motion.div
              key={theme.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              whileHover={{ y: -5 }}
              className="group w-full sm:w-[calc(50%-0.5rem)] md:w-[calc(33.333%-0.667rem)] bg-base-200 border border-primary/10 rounded-xl p-5 transition-shadow duration-300 hover:border-primary/30 hover:shadow-[0_0_24px_rgba(143,39,224,0.16)]"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono text-primary/60">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="text-base font-semibold text-primary">{theme.title}</h3>
              </div>
              <p className="text-sm text-base-content/70 leading-relaxed">{theme.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default EventStructureSection;
