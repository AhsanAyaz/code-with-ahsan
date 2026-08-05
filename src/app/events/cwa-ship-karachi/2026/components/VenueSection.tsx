"use client";

import { motion } from "framer-motion";
import { MapPin, Check, Clock } from "lucide-react";
import { VENUE, EVENT, SECTION_IDS } from "../constants";

const VenueSection = () => {
  return (
    <section id={SECTION_IDS.venue} className="py-16 sm:py-24 relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 max-w-5xl relative z-10">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-3">
            <MapPin className="w-5 h-5 text-primary" />
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary">The Venue</h2>
          </div>
          <p className="text-base-content/70 max-w-2xl mx-auto text-sm sm:text-base">
            This is an on-site event — everything happens under one roof on {EVENT.dateLabel}.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.4 }}
          whileHover={{ y: -4 }}
          className="grid md:grid-cols-2 gap-0 rounded-2xl border border-primary/20 bg-base-200 overflow-hidden shadow-[0_0_24px_rgba(143,39,224,0.1)] transition-shadow duration-300 hover:shadow-[0_0_36px_rgba(143,39,224,0.22)]"
        >
          {/* Left: status */}
          <div className="p-6 sm:p-8">
            <span className="inline-flex items-center gap-2 badge badge-primary badge-outline mb-4 font-mono text-xs uppercase tracking-wider">
              <Clock className="w-3.5 h-3.5" />
              To Be Decided
            </span>
            <h3 className="text-xl sm:text-2xl font-bold text-base-content mb-3">{VENUE.name}</h3>
            <p className="text-sm sm:text-base text-base-content/70 leading-relaxed mb-5">
              {VENUE.note}
            </p>

            <ul className="space-y-2">
              {VENUE.highlights.map((h) => (
                <li key={h} className="flex items-center gap-2.5 text-sm text-base-content/80">
                  <Check className="w-4 h-4 text-primary shrink-0" />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right: stylized placeholder (on-palette, no external asset) */}
          <div className="relative min-h-[220px] md:min-h-full bg-base-300 flex items-center justify-center overflow-hidden">
            <div
              className="absolute inset-0 opacity-[0.5]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(143,39,224,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(143,39,224,0.12) 1px, transparent 1px)",
                backgroundSize: "28px 28px",
              }}
            />
            <div
              className="absolute w-56 h-56 rounded-full blur-3xl opacity-30"
              style={{ background: "radial-gradient(circle, #8f27e0 0%, transparent 70%)" }}
            />
            <div className="relative flex flex-col items-center gap-2 text-center px-6">
              <motion.span
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                className="w-12 h-12 rounded-full bg-primary/20 border border-primary/50 flex items-center justify-center"
              >
                <MapPin className="w-6 h-6 text-primary" />
              </motion.span>
              <span className="text-xs font-mono uppercase tracking-wider text-base-content/50">
                Location announced soon
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default VenueSection;
