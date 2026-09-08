"use client";

import { motion } from "framer-motion";
import { Compass, Briefcase, Building2, Linkedin, Mail } from "lucide-react";
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

        {/* items-stretch (the default) is what equalises card heights per row —
            do not put an explicit height on the cards or it is overridden. */}
        <div className="flex flex-wrap items-stretch justify-center gap-5 sm:gap-6">
          {MENTOR_PROFILES.map((mentor, index) => (
            <motion.article
              key={mentor.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: 0.3, delay: (index % 3) * 0.06 }}
              whileHover={{ y: -5 }}
              className="group flex w-full flex-col rounded-2xl border border-primary/15 bg-base-200 p-6 text-center shadow-[0_0_16px_rgba(143,39,224,0.08)] transition-all duration-300 hover:border-primary/35 hover:shadow-[0_0_28px_rgba(143,39,224,0.2)] sm:w-[calc(50%-0.75rem)] sm:p-7 lg:w-[calc(33.333%-1rem)]"
            >
              <div className="mb-4 flex justify-center">
                <PersonAvatar
                  name={mentor.name}
                  src={mentor.avatarUrl}
                  size={128}
                  className="transition-transform duration-300 group-hover:scale-105"
                />
              </div>

              <h3 className="text-lg font-semibold leading-tight text-base-content">
                {mentor.name}
              </h3>

              {/* The placeholder only stands in when we have nothing at all — a
                  mentor with a role and organisation does not need it. */}
              {isPending(mentor.experience) ? (
                isPending(mentor.position) &&
                isPending(mentor.organization) && (
                  <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-base-content/40">
                    Details to be announced
                  </p>
                )
              ) : (
                <span className="badge badge-outline badge-primary badge-sm mt-2">
                  {mentor.experience}
                </span>
              )}

              <div className="mt-4 space-y-2 text-left">
                {!isPending(mentor.position) && (
                  <p className="flex items-start gap-2 text-sm text-base-content/70">
                    <Briefcase className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{mentor.position}</span>
                  </p>
                )}
                {!isPending(mentor.organization) && (
                  <p className="flex items-start gap-2 text-sm text-base-content/70">
                    <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{mentor.organization}</span>
                  </p>
                )}
              </div>

              {/* mt-auto pins the contact links to the bottom of every card, so they
                  line up across the row however the name and role wrap. */}
              <div className="mt-auto flex flex-col items-center gap-2 pt-5">
                {mentor.email.trim().length > 0 && (
                  <a
                    href={`mailto:${mentor.email}`}
                    className="inline-flex max-w-full items-center gap-1.5 text-sm text-base-content/70 transition-colors hover:text-primary"
                  >
                    <Mail className="h-4 w-4 shrink-0 text-primary" />
                    <span className="truncate">{mentor.email}</span>
                  </a>
                )}
                {mentor.linkedinUrl.trim().length > 0 && (
                  <a
                    href={mentor.linkedinUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={`${mentor.name} on LinkedIn`}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                  >
                    <Linkedin className="h-4 w-4" />
                    LinkedIn
                  </a>
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
