"use client";

import { motion } from "framer-motion";
import { Building2 } from "lucide-react";
import Image from "next/image";
import { CONFIRMED_SPONSORS, SPONSOR_PLACEHOLDERS } from "../constants";

const TIER_COLORS: Record<string, string> = {
  "Tool Partner": "text-success",
  "Gold Sponsor": "text-warning",
  "Gold": "text-warning",
  "Platinum Sponsor": "text-yellow-300",
  "Platinum": "text-yellow-300",
  "Community Partner": "text-primary",
};
const getTierColor = (tier: string) => TIER_COLORS[tier] ?? "text-primary";

const CurrentSponsorsSection = () => {
  return (
    <section className="pb-16 sm:pb-24 relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-3">Our Sponsors</h2>
          <p className="text-sm sm:text-base text-base-content/70">
            Proudly supported by our partners.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
          {CONFIRMED_SPONSORS.map((sponsor, index) => (
            <motion.a
              key={sponsor.name}
              href={sponsor.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ delay: index * 0.04, duration: 0.3 }}
              className="h-36 mask mask-squircle bg-base-200 flex flex-col items-center justify-center text-center p-5 hover:bg-base-300 transition-colors"
            >
              <Image
                src={sponsor.logoUrl}
                alt={`${sponsor.name} logo`}
                width={80}
                height={60}
                className="object-contain mask mask-squircle p-2"
              />
              <span className="text-[11px] font-bold text-white mt-1 leading-tight">{sponsor.name}</span>
              <span className={`text-[10px] font-semibold ${getTierColor(sponsor.tier)}`}>{sponsor.tier}</span>
            </motion.a>
          ))}
          {SPONSOR_PLACEHOLDERS.map((item, index) => (
            <motion.div
              key={`${item.tierHint}-${index}`}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ delay: (CONFIRMED_SPONSORS.length + index) * 0.04, duration: 0.3 }}
              className="h-36 mask mask-squircle border border-dashed border-primary/30 bg-base-200 flex flex-col items-center justify-center text-center p-5"
            >
              <Building2 className="w-5 h-5 text-primary/70 mb-2" />
              <span className="text-xs font-semibold text-base-content/80">{item.tierHint}</span>
              <span className="text-[11px] text-base-content/60">Your Logo Here</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CurrentSponsorsSection;
