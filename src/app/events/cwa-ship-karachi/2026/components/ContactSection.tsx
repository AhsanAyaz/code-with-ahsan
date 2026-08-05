"use client";

import { motion } from "framer-motion";
import { Mail, UserRound } from "lucide-react";
import { CONTACTS, EVENT, SECTION_IDS } from "../constants";
import PersonAvatar from "./PersonAvatar";

const isPending = (value: string) => !value || value.trim().toUpperCase() === "TODO";

const ContactSection = () => {
  return (
    <section id={SECTION_IDS.contact} className="py-16 sm:py-24 relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 max-w-4xl relative z-10">
        <div className="text-center mb-10">
          <div className="mb-3 flex items-center justify-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold text-primary sm:text-3xl md:text-4xl">Contact Us</h2>
          </div>
          <p className="mx-auto max-w-2xl text-sm text-base-content/70 sm:text-base">
            Join us in empowering the next generation of devs of {EVENT.name}.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {CONTACTS.map((contact, index) => (
            <motion.article
              key={contact.email}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.35, delay: index * 0.08 }}
              whileHover={{ y: -5 }}
              className="group relative overflow-hidden rounded-2xl border border-primary/15 bg-base-200 p-6 text-center shadow-[0_0_20px_rgba(143,39,224,0.08)] transition-all duration-300 hover:border-primary/40 hover:shadow-[0_0_34px_rgba(143,39,224,0.22)]"
            >
              {/* Top accent */}
              <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

              <span className="badge badge-primary badge-outline mb-5 gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em]">
                <UserRound className="h-3 w-3" />
                {contact.role}
              </span>

              <div className="mb-4 flex justify-center">
                <PersonAvatar
                  name={contact.name}
                  src={contact.avatarUrl}
                  size={200}
                  className="transition-transform duration-300 group-hover:scale-105"
                />
              </div>

              <h3 className="text-lg font-semibold leading-tight text-base-content">
                {contact.name}
              </h3>

              {!isPending(contact.title) && (
                <p className="mt-1 text-sm text-base-content/60">{contact.title}</p>
              )}

              <a
                href={`mailto:${contact.email}`}
                className="mt-4 inline-flex items-center gap-2 break-all text-sm font-medium text-primary hover:underline"
              >
                <Mail className="h-4 w-4 shrink-0" />
                {contact.email}
              </a>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
