"use client";

import { motion } from "framer-motion";
import { COMMUNITY_STATS } from "../constants";

const CommunityStatsSection = () => {
  return (
    <section className="relative pb-8 sm:pb-12 -mt-10 sm:-mt-16 z-20">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
          {COMMUNITY_STATS.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: index * 0.06, duration: 0.35 }}
              className="bg-base-200 border border-primary/15 rounded-xl p-4 text-center shadow-[0_0_14px_rgba(143,39,224,0.1)]"
            >
              <div className="text-lg sm:text-2xl font-bold text-primary">{stat.value}</div>
              <div className="text-[11px] sm:text-xs text-base-content/70 mt-1 uppercase tracking-wider">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CommunityStatsSection;
