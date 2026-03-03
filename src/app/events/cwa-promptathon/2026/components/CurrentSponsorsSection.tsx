"use client";

import { motion } from "framer-motion";
import { Building2 } from "lucide-react";
import { SPONSOR_PLACEHOLDERS } from "../constants";

const CurrentSponsorsSection = () => {
  return (
    <section className="pb-16 sm:pb-24 relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          className="text-center mb-8"
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-3">Our Sponsors</h2>
          <p className="text-sm sm:text-base text-base-content/70">
            Sponsorship spots available. Confirmed partners will appear here.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
          {SPONSOR_PLACEHOLDERS.map((item, index) => (
            <motion.div
              key={`${item.tierHint}-${index}`}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: index * 0.04, duration: 0.3 }}
              className="h-28 rounded-xl border border-dashed border-primary/30 bg-base-200 flex flex-col items-center justify-center text-center px-3"
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
