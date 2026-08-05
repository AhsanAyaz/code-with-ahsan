"use client";

import { motion } from "framer-motion";
import { Compass, Briefcase, Building2 } from "lucide-react";
import { MENTOR_PROFILES, SECTION_IDS } from "../constants";
import PersonAvatar from "./PersonAvatar";

/** Values still marked TODO in constants render as a neutral placeholder. */
const isPending = (value: string) => !value || value.trim().toUpperCase() === "TODO";

const MentorsSection = () => {
  return (
    <section id={SECTION_IDS.mentors} className="py-12 sm:py-16 relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 max-w-6xl relative z-10">
        <div className="mb-8 text-center">
          <div className="mb-3 flex items-center justify-center gap-2">
            <Compass className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold text-primary sm:text-3xl">Mentors</h2>
          </div>
          <p className="mx-auto max-w-2xl text-sm text-base-content/70 sm:text-base">
            Mentors are on the floor for the whole build sprint — guiding teams, reviewing
            approaches, and unblocking you when you get stuck.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-4 sm:gap-5">
          {MENTOR_PROFILES.map((mentor, index) => (
            <motion.article
              key={mentor.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: 0.3, delay: (index % 4) * 0.06 }}
              whileHover={{ y: -5 }}
              className="group w-full rounded-2xl border border-primary/15 bg-base-200 p-5 text-center shadow-[0_0_16px_rgba(143,39,224,0.08)] transition-all duration-300 hover:border-primary/35 hover:shadow-[0_0_28px_rgba(143,39,224,0.2)] sm:w-[calc(50%-0.625rem)] lg:w-[calc(25%-0.9375rem)]"
            >
              <div className="mb-3 flex justify-center">
                <PersonAvatar
                  name={mentor.name}
                  src={mentor.avatarUrl}
                  size={80}
                  className="transition-transform duration-300 group-hover:scale-105"
                />
              </div>

              <h3 className="text-base font-semibold leading-tight text-base-content">
                {mentor.name}
              </h3>

              {isPending(mentor.experience) ? (
                <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-base-content/40">
                  Details to be announced
                </p>
              ) : (
                <span className="badge badge-outline badge-primary badge-sm mt-2">
                  {mentor.experience}
                </span>
              )}

              <div className="mt-3 space-y-1.5 text-left">
                {!isPending(mentor.position) && (
                  <p className="flex items-start gap-2 text-xs text-base-content/70">
                    <Briefcase className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    <span>{mentor.position}</span>
                  </p>
                )}
                {!isPending(mentor.organization) && (
                  <p className="flex items-start gap-2 text-xs text-base-content/70">
                    <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    <span>{mentor.organization}</span>
                  </p>
                )}
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MentorsSection;
