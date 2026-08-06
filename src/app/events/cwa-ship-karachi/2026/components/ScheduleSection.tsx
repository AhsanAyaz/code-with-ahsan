"use client";

import { motion } from "framer-motion";
import { Clock, UserPlus, Mic, Code2, Utensils, Upload, Gavel, Trophy } from "lucide-react";
import { DAY_SCHEDULE, EVENT, SECTION_IDS, type ScheduleKind } from "../constants";

const KIND_META: Record<ScheduleKind, { label: string; icon: typeof Clock }> = {
  registration: { label: "Check-in", icon: UserPlus },
  kickoff: { label: "Kick-off", icon: Mic },
  build: { label: "Build", icon: Code2 },
  break: { label: "Break", icon: Utensils },
  submission: { label: "Submit", icon: Upload },
  judging: { label: "Judging", icon: Gavel },
  closing: { label: "Closing", icon: Trophy },
};

const ScheduleSection = () => {
  return (
    <section id={SECTION_IDS.schedule} className="py-16 sm:py-24 relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 max-w-4xl relative z-10">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-primary" />
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary">Schedule</h2>
          </div>
          <p className="text-base-content/70 max-w-2xl mx-auto text-sm sm:text-base">
            {EVENT.dateLabel} · {EVENT.timeLabel}. Proposed running order — timings may shift
            slightly on the day.
          </p>
        </div>

        {/* Timeline */}
        <ol className="relative">
          {/* Vertical rail */}
          <span
            className="absolute left-[19px] sm:left-[27px] top-2 bottom-2 w-px bg-gradient-to-b from-primary/10 via-primary/30 to-primary/10"
            aria-hidden
          />

          {DAY_SCHEDULE.map((item, index) => {
            const meta = KIND_META[item.kind];
            const Icon = meta.icon;
            return (
              <motion.li
                key={item.title}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.3, delay: (index % 4) * 0.04 }}
                className="relative pl-12 sm:pl-16 pb-5 last:pb-0"
              >
                {/* Node */}
                <span className="absolute left-2 sm:left-3 top-1.5 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center border bg-primary/20 border-primary/60 shadow-[0_0_12px_rgba(143,39,224,0.35)]">
                  <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary" />
                </span>

                <div className="group rounded-xl border border-primary/12 bg-base-200 p-4 sm:p-5 transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_22px_rgba(143,39,224,0.15)] hover:-translate-y-0.5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-1">
                    <span className="text-sm font-mono font-semibold text-primary">
                      {item.time}
                    </span>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-base-content/50 border border-primary/15 rounded px-1.5 py-0.5">
                      {meta.label}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-base-content leading-tight">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-base-content/70 mt-1 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </motion.li>
            );
          })}
        </ol>
      </div>
    </section>
  );
};

export default ScheduleSection;
