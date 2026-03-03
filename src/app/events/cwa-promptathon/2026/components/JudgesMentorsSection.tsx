"use client";

import { motion } from "framer-motion";
import { BadgeCheck, UserRound } from "lucide-react";
import { JUDGES_PLACEHOLDERS } from "../constants";

const JudgesMentorsSection = () => {
  return (
    <section className="py-16 sm:py-24 relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          className="text-center mb-10"
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-3">Judges & Mentors</h2>
          <p className="text-sm sm:text-base text-base-content/70 max-w-2xl mx-auto">
            Meet the judges and mentors guiding participants through the sprint.
            Announcements will be published here as confirmations are finalized.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 max-w-6xl mx-auto">
          {JUDGES_PLACEHOLDERS.map((person, index) => (
            <motion.div
              key={`${person.role}-${index}`}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="rounded-2xl p-5 border border-primary/15 bg-base-200 shadow-[0_0_18px_rgba(143,39,224,0.08)]"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="badge badge-outline badge-primary text-[11px]">{person.role}</span>
                <BadgeCheck className="w-4 h-4 text-primary/80" />
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <UserRound className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-base font-semibold text-base-content">Announced Soon</h3>
              <p className="text-sm text-base-content/70 mt-1">Name, title, and company will be updated.</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default JudgesMentorsSection;
