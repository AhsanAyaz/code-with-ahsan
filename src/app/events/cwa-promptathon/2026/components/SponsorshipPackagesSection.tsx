"use client";

import { motion } from "framer-motion";
import { Handshake, Rocket, Sparkles } from "lucide-react";

const SponsorshipPackagesSection = () => {
  return (
    <section id="sponsorship-packages" className="py-16 sm:py-24 relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          className="text-center mb-10"
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-3">Sponsorship Packages</h2>
          <p className="text-sm sm:text-base text-base-content/70 max-w-2xl mx-auto">
            We are prioritizing tool partners for this event and also offering a lightweight cash sponsorship track.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-5 max-w-5xl mx-auto mb-8">
          <div className="rounded-2xl border border-primary/30 bg-base-200 p-6 shadow-[0_0_20px_rgba(143,39,224,0.15)]">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-primary" />
              <h3 className="text-xl font-semibold text-base-content">Tool Partner (Primary)</h3>
            </div>
            <p className="text-sm text-base-content/70 mb-4">
              Provide API credits or licenses for participants. No cash commitment required.
            </p>
            <ul className="text-sm text-base-content/80 space-y-2">
              <li>Logo on event page and social coverage</li>
              <li>Dedicated Discord channel for participant support</li>
              <li>Live demo slot during the event</li>
              <li>Product included in onboarding recommendations</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-primary/15 bg-base-200 p-6 shadow-[0_0_18px_rgba(143,39,224,0.08)]">
            <div className="flex items-center gap-2 mb-3">
              <Handshake className="w-5 h-5 text-primary" />
              <h3 className="text-xl font-semibold text-base-content">Community Partner</h3>
            </div>
            <p className="text-sm text-base-content/70 mb-4">Recommended paid tier for this edition: $750.</p>
            <ul className="text-sm text-base-content/80 space-y-2">
              <li>Logo on event page and key social posts</li>
              <li>Swag distribution support</li>
              <li>Product showcase in hackathon resources</li>
              <li>Priority mention at kickoff and winners segment</li>
            </ul>
          </div>
        </div>

        <div className="max-w-5xl mx-auto rounded-2xl border border-primary/15 bg-base-200 p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm text-base-content/70">
              Need the full Platinum/Gold/Silver/Bronze details?
            </p>
            <a href="/events/cwa-promptathon/2026/sponsorships" className="btn btn-sm btn-outline btn-primary">
              <Rocket className="w-4 h-4" />
              View Full Sponsorship Matrix
            </a>
          </div>
          <p className="text-xs text-base-content/60 mt-4">
            Custom packages available. Contact:{" "}
            <a href="mailto:maham.visionwiseab@gmail.com" className="text-primary hover:underline">
              maham.visionwiseab@gmail.com
            </a>{" "}
            or{" "}
            <a href="mailto:ahsan.ubitian@gmail.com" className="text-primary hover:underline">
              ahsan.ubitian@gmail.com
            </a>
          </p>
        </div>
      </div>
    </section>
  );
};

export default SponsorshipPackagesSection;
