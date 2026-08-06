"use client";

import { motion } from "framer-motion";
import { Zap, Check, Clock, MapPin } from "lucide-react";
import { TRACK, EVENT } from "../constants";

const TracksSection = () => {
  return (
    <section className="py-16 sm:py-24 relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 max-w-4xl relative z-10">
        <div className="text-center mb-10 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary mb-3">
            One Day. One Track.
          </h2>
          <p className="text-base-content/70 max-w-2xl mx-auto text-sm sm:text-base">
            {EVENT.name} is a single on-site hackathon — no parallel programme to split your
            attention. You show up in the morning, build all day, and demo before you leave.
          </p>
        </div>

        <motion.article
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.4 }}
          whileHover={{ y: -6 }}
          className="group relative rounded-2xl border border-primary/40 bg-base-200 p-6 sm:p-10 shadow-[0_0_28px_rgba(143,39,224,0.14)] transition-shadow duration-300 hover:shadow-[0_0_40px_rgba(143,39,224,0.3)]"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-primary/70">
              {TRACK.label}
            </span>
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-base-content/50">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary/70" />
                {TRACK.timeLabel}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-primary/70" />
                {EVENT.locationShort}
              </span>
            </div>
          </div>

          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110">
            <Zap className="w-6 h-6 text-primary" />
          </div>

          <h3 className="text-2xl sm:text-4xl font-bold text-base-content mb-3">{TRACK.title}</h3>
          <p className="text-sm sm:text-lg text-base-content/70 mb-7 max-w-2xl">{TRACK.tagline}</p>

          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
            {TRACK.points.map((point) => (
              <li key={point} className="flex items-start gap-2.5 text-sm text-base-content/80">
                <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </motion.article>
      </div>
    </section>
  );
};

export default TracksSection;
