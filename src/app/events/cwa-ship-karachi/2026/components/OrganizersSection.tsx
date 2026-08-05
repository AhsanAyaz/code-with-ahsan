"use client";

import { motion } from "framer-motion";
import { Linkedin, Instagram, Mail, Users } from "lucide-react";
import { ORGANIZER_PROFILES, SECTION_IDS } from "../constants";
import PersonAvatar from "./PersonAvatar";

const isPending = (value: string) => !value || value.trim().toUpperCase() === "TODO";

const SocialLink = ({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: typeof Mail;
}) => (
  <a
    href={href}
    target={href.startsWith("mailto:") ? undefined : "_blank"}
    rel="noreferrer noopener"
    aria-label={label}
    title={label}
    className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/25 bg-base-300 text-base-content/70 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/60 hover:bg-primary/15 hover:text-primary"
  >
    <Icon className="h-3.5 w-3.5" />
  </a>
);

const OrganizersSection = () => {
  return (
    <section id={SECTION_IDS.organizers} className="py-16 sm:py-24 relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 max-w-6xl relative z-10">
        <div className="text-center mb-10">
          <div className="mb-3 flex items-center justify-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold text-primary sm:text-3xl md:text-4xl">
              The Organising Team
            </h2>
          </div>
          <p className="mx-auto max-w-2xl text-sm text-base-content/70 sm:text-base">
            The people putting the day together — from the venue and the schedule to the mentors on
            the floor.
          </p>
        </div>

        {/* flex-wrap + justify-center keeps a partial final row centred */}
        <div className="flex flex-wrap justify-center gap-5">
          {ORGANIZER_PROFILES.map((organizer, index) => {
            const links = [
              organizer.linkedin && {
                href: `https://www.linkedin.com/in/${organizer.linkedin}`,
                label: `${organizer.name} on LinkedIn`,
                icon: Linkedin,
              },
              organizer.instagram && {
                href: `https://instagram.com/${organizer.instagram}`,
                label: `${organizer.name} on Instagram`,
                icon: Instagram,
              },
              organizer.email && {
                href: `mailto:${organizer.email}`,
                label: `Email ${organizer.name}`,
                icon: Mail,
              },
            ].filter(Boolean) as { href: string; label: string; icon: typeof Mail }[];

            return (
              <motion.article
                key={organizer.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ duration: 0.3, delay: (index % 4) * 0.06 }}
                whileHover={{ y: -6 }}
                className="group relative w-full overflow-hidden rounded-2xl border border-primary/15 bg-base-200 p-5 text-center shadow-[0_0_16px_rgba(143,39,224,0.08)] transition-all duration-300 hover:border-primary/40 hover:shadow-[0_0_30px_rgba(143,39,224,0.22)] sm:w-[calc(50%-0.625rem)] lg:w-[calc(25%-0.9375rem)]"
              >
                {/* Hover glow */}
                <span className="pointer-events-none absolute -top-10 left-1/2 h-24 w-24 -translate-x-1/2 rounded-full bg-primary/20 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100" />

                <div className="relative mb-3 flex justify-center">
                  <PersonAvatar
                    name={organizer.name}
                    src={organizer.avatarUrl}
                    size={80}
                    className="transition-transform duration-300 group-hover:scale-105"
                  />
                </div>

                <h3 className="relative text-base font-semibold leading-tight text-base-content">
                  {organizer.name}
                </h3>

                <p className="relative mt-1 text-xs text-base-content/60">
                  {isPending(organizer.title) ? "Organiser" : organizer.title}
                </p>

                {links.length > 0 && (
                  <div className="relative mt-4 flex items-center justify-center gap-2">
                    {links.map((link) => (
                      <SocialLink key={link.href} {...link} />
                    ))}
                  </div>
                )}
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default OrganizersSection;
