"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { ExternalLink, Award, Briefcase, Building2, Quote } from "lucide-react";
import { JUDGES, EVENT, SECTION_IDS } from "../constants";

const JudgesSection = () => {
  return (
    <section id={SECTION_IDS.judges} className="py-16 sm:py-24 relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 max-w-5xl relative z-10">
        <div className="mb-10 text-center sm:mb-14">
          <div className="mb-3 flex items-center justify-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold text-primary sm:text-3xl md:text-4xl">Judges</h2>
          </div>
          <p className="mx-auto max-w-2xl text-sm text-base-content/70 sm:text-base">
            The panel scoring every submission at {EVENT.name}.
          </p>
        </div>

        <div className="flex flex-col gap-6 sm:gap-8">
          {JUDGES.map((judge, index) => {
            // Rows alternate: even → photo left, odd → photo right. Works for
            // any number of judges. Mobile always stacks photo on top.
            const flipped = index % 2 === 1;

            return (
              <motion.article
                key={judge.name}
                initial={{ opacity: 0, x: flipped ? 28 : -28 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className={`group relative grid overflow-hidden rounded-3xl border border-primary/15 bg-base-200 shadow-[0_0_22px_rgba(143,39,224,0.08)] transition-all duration-300 hover:border-primary/40 hover:shadow-[0_0_40px_rgba(143,39,224,0.24)] ${
                  flipped
                    ? "sm:grid-cols-[minmax(0,1fr)_260px]"
                    : "sm:grid-cols-[260px_minmax(0,1fr)]"
                }`}
              >
                {/* Accent rail on the outer edge */}
                <span
                  className={`pointer-events-none absolute inset-y-0 w-[3px] bg-gradient-to-b from-primary/0 via-primary/70 to-primary/0 opacity-60 transition-opacity duration-300 group-hover:opacity-100 ${
                    flipped ? "right-0" : "left-0"
                  }`}
                />

                {/* Photo */}
                <div
                  className={`relative min-h-[260px] bg-base-300 sm:min-h-full ${
                    flipped ? "sm:order-2" : "sm:order-1"
                  }`}
                >
                  <Image
                    src={judge.avatarUrl}
                    alt={judge.name}
                    fill
                    unoptimized
                    sizes="(max-width: 640px) 100vw, 260px"
                    className={`transition-transform duration-500 group-hover:scale-[1.04] ${
                      judge.avatarUrl.endsWith(".svg")
                        ? "object-contain p-8 opacity-70"
                        : "object-cover object-top"
                    }`}
                  />
                  {/* Fade the photo into the card body, on whichever side the text sits */}
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background: flipped
                        ? "linear-gradient(to left, transparent 50%, rgba(24,17,38,0.55) 100%)"
                        : "linear-gradient(to right, transparent 50%, rgba(24,17,38,0.55) 100%)",
                    }}
                  />
                </div>

                {/* Details */}
                <div
                  className={`relative flex flex-col justify-center p-6 sm:p-9 ${
                    flipped ? "sm:order-1" : "sm:order-2"
                  }`}
                >
                  {/* Oversized index watermark */}
                  <span
                    className={`pointer-events-none absolute top-3 select-none font-mono text-6xl font-bold leading-none text-primary/[0.07] sm:text-7xl ${
                      flipped ? "left-6" : "right-6"
                    }`}
                    aria-hidden
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <h3 className="relative text-xl font-bold leading-tight text-base-content sm:text-2xl">
                    {judge.name}
                  </h3>

                  <div className="relative mt-4 space-y-2">
                    <p className="flex items-start gap-2.5 text-sm text-base-content/75 sm:text-base">
                      <Briefcase className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{judge.position}</span>
                    </p>
                    <p className="flex items-start gap-2.5 text-sm text-base-content/75 sm:text-base">
                      <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{judge.company}</span>
                    </p>
                    <p className="flex items-start gap-2.5 text-sm text-base-content/75 sm:text-base">
                      <Award className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{judge.experience} of experience</span>
                    </p>
                  </div>

                  {/* Quote — hidden until a real one is collected. */}
                  {judge.quote.trim().length > 0 && (
                    <blockquote className="relative mt-5 border-l-2 border-primary/50 pl-4 text-sm italic text-base-content/80 sm:text-base">
                      <Quote
                        className="absolute -left-[9px] -top-2 h-4 w-4 bg-base-200 text-primary"
                        aria-hidden
                      />
                      {judge.quote}
                    </blockquote>
                  )}

                  <a
                    href={judge.linkedinUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="relative mt-6 inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                  >
                    LinkedIn
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default JudgesSection;
