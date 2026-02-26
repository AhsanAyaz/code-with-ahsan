"use client";

import { motion } from "framer-motion"; // Import motion
import { ExternalLink, Mail, FileText, Sparkles } from "lucide-react";

const EventStructureSection = () => {
  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7 } },
  };

  return (
    <section className="py-16 sm:py-24 relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 max-w-3xl text-center relative z-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={itemVariants}
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-primary" />
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold font-mono text-primary">
              Event Structure
            </h2>
          </div>
          <p className="text-base-content/70 mb-8 leading-relaxed text-sm sm:text-base max-w-lg mx-auto">
            Want a detailed breakdown of the schedule, guidelines, and rules for the hackathon?
            Please read our official structure document.
          </p>

          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}> {/* Added hover animation */}
            <a
              href="#" // Placeholder link
              className="btn btn-outline btn-primary btn-lg rounded-xl gap-2 mb-12 sm:mb-16"
            >
              <ExternalLink className="w-4 h-4" />
              View Event Structure Doc
            </a>
          </motion.div>
        </motion.div>

        {/* Sponsor card */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          transition={{ delay: 0.2 }} // Added slight delay for staggered effect
          variants={itemVariants}
          className="bg-base-200 rounded-2xl p-6 sm:p-8 relative shadow-lg border border-base-300"
        >
          <motion.div
            className="absolute -top-3 left-1/2 -translate-x-1/2"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full badge badge-primary badge-outline text-xs font-mono">
              <Sparkles className="w-3 h-3" />
              Sponsors Welcome
            </div>
          </motion.div>

          <div className="flex items-center justify-center gap-2 mb-3 mt-2">
            <Mail className="w-5 h-5 text-primary" />
            <h3 className="text-base sm:text-lg font-semibold font-mono text-base-content">
              Interested in Sponsoring?
            </h3>
          </div>
          <p className="text-base-content/70 text-xs sm:text-sm">
            Contact us at{" "}
            <a href="mailto:maham.visionwiseab@gmail.com" className="text-primary hover:underline font-mono text-xs">
              maham.visionwiseab@gmail.com
            </a>{" "}
            or{" "}
            <a href="mailto:ahsan.ubitian@gmail.com" className="text-primary hover:underline font-mono text-xs">
              ahsan.ubitian@gmail.com
            </a>
          </p>
        </motion.div>

      </div>
    </section>
  );
};

export default EventStructureSection;
