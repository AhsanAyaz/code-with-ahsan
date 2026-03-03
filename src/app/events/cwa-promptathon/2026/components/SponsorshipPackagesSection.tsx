"use client";

import { motion } from "framer-motion";
import { Handshake, Sparkles } from "lucide-react";
import { SPONSORSHIP_FEATURES } from "../constants";

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
          <h3 className="text-lg sm:text-xl font-semibold text-primary mb-4">
            Full Sponsorship Tier Matrix
          </h3>
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full text-sm">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th>Platinum ($2,000)</th>
                  <th>Gold ($1,500)</th>
                  <th>Silver ($1,000)</th>
                  <th>Bronze ($500)</th>
                </tr>
              </thead>
              <tbody>
                {SPONSORSHIP_FEATURES.map((feature) => (
                  <tr key={feature.name}>
                    <td>{feature.name}</td>
                    <td>{feature.platinum}</td>
                    <td>{feature.gold}</td>
                    <td>{feature.silver}</td>
                    <td>{feature.bronze}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
