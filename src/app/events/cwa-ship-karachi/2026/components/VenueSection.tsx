"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { MapPin, Check, ExternalLink } from "lucide-react";
import { VENUE, EVENT, SECTION_IDS } from "../constants";

const VenueSection = () => {
  return (
    <section id={SECTION_IDS.venue} className="relative overflow-hidden py-16 sm:py-24">
      <div className="container relative z-10 mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          <div className="mb-3 flex items-center justify-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold text-primary sm:text-3xl md:text-4xl">The Venue</h2>
          </div>
          <p className="mx-auto max-w-2xl text-sm text-base-content/70 sm:text-base">
            This is an on-site event — everything happens under one roof on {EVENT.dateLabel}.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.4 }}
          whileHover={{ y: -4 }}
          className="grid gap-0 overflow-hidden rounded-2xl border border-primary/20 bg-base-200 shadow-[0_0_24px_rgba(143,39,224,0.1)] transition-shadow duration-300 hover:shadow-[0_0_36px_rgba(143,39,224,0.22)] md:grid-cols-2"
        >
          {/* Left: venue details */}
          <div className="p-6 sm:p-8">
            <span className="badge badge-primary badge-outline mb-4 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider">
              <MapPin className="h-3.5 w-3.5" />
              Host Venue
            </span>

            <h3 className="mb-2 text-xl font-bold text-base-content sm:text-2xl">{VENUE.name}</h3>

            {VENUE.addressLines.length > 0 && (
              <address className="mb-3 text-sm not-italic leading-relaxed text-base-content/60">
                {VENUE.addressLines.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </address>
            )}

            <p className="mb-5 text-sm leading-relaxed text-base-content/70 sm:text-base">
              {VENUE.note}
            </p>

            <ul className="mb-6 space-y-2">
              {VENUE.highlights.map((h) => (
                <li key={h} className="flex items-center gap-2.5 text-sm text-base-content/80">
                  <Check className="h-4 w-4 shrink-0 text-primary" />
                  <span>{h}</span>
                </li>
              ))}
            </ul>

            {VENUE.mapUrl && (
              <a
                href={VENUE.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-sm gap-2 rounded-xl"
              >
                <MapPin className="h-4 w-4" />
                Get Directions
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>

          {/* Right: host logo on the grid backdrop */}
          <div className="relative flex min-h-[220px] items-center justify-center overflow-hidden bg-base-300 md:min-h-full">
            <div
              className="absolute inset-0 opacity-[0.5]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(143,39,224,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(143,39,224,0.12) 1px, transparent 1px)",
                backgroundSize: "28px 28px",
              }}
            />
            <div
              className="absolute h-56 w-56 rounded-full opacity-30 blur-3xl"
              style={{ background: "radial-gradient(circle, #8f27e0 0%, transparent 70%)" }}
            />
            <div className="relative flex flex-col items-center gap-3 px-6 text-center">
              <div className="rounded-2xl bg-white/95 px-6 py-5 shadow-[0_0_30px_rgba(255,255,255,0.12)]">
                <Image
                  src={VENUE.logoUrl}
                  alt={`${VENUE.name} logo`}
                  width={240}
                  height={116}
                  unoptimized
                  className="h-auto w-[150px] object-contain"
                />
              </div>
              <span className="font-mono text-xs uppercase tracking-wider text-base-content/50">
                Our host for the day
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default VenueSection;
