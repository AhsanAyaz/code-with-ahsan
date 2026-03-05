"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { JUDGES } from "../constants";

const JudgesMentorsSection = () => {
  return (
    <section className="py-12 sm:py-16 relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 max-w-6xl relative z-10">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-3">Judges & Mentors</h2>
          <p className="text-sm sm:text-base text-base-content/70">
            Confirmed judges for CWA Prompt-a-thon 2026.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {JUDGES.map((judge, index) => (
            <motion.article
              key={judge.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="rounded-2xl border border-primary/15 bg-base-200 p-5 shadow-[0_0_16px_rgba(143,39,224,0.08)]"
            >
              <div className="flex items-start gap-4">
                <Image
                  src={judge.avatarUrl}
                  alt={judge.name}
                  width={64}
                  height={64}
                  unoptimized
                  className="w-16 h-16 rounded-full object-cover border border-primary/20"
                />
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-base-content leading-tight">
                    {judge.name}
                  </h3>
                  <p className="text-sm text-base-content/70 mt-1">{judge.title}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="badge badge-outline badge-primary">
                  Experience: {judge.experience}
                </span>
                <a
                  href={judge.linkedinUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-primary hover:underline text-sm inline-flex items-center gap-1"
                >
                  LinkedIn
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default JudgesMentorsSection;
