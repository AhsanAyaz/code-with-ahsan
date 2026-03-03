"use client";

import { motion } from "framer-motion";
import { Sparkles, Handshake, Crown } from "lucide-react";

const SPONSORSHIP_PAGE = "/events/cwa-promptathon/2026/sponsorship";

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
          <p className="text-sm sm:text-base text-base-content/70 max-w-3xl mx-auto">
            We are prioritizing tool partners for this event and offering lightweight cash tiers.
            Full details on our sponsorship page.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-5 max-w-6xl mx-auto">
          <article className="rounded-2xl border border-success/40 bg-base-200 p-6 shadow-[0_0_20px_rgba(30,200,120,0.08)]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
              <h3 className="text-xl font-semibold text-base-content">Tool Partner</h3>
              <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-success text-success-content whitespace-nowrap self-start sm:self-auto">
                Primary
              </span>
            </div>
            <p className="text-sm text-base-content/70 mb-4">
              Provide API credits or licenses. No cash required.
            </p>
            <ul className="text-sm text-base-content/80 space-y-2 mb-5">
              <li>Logo on event page and social posts</li>
              <li>Dedicated Discord channel</li>
              <li>Live demo slot</li>
              <li>Product featured in participant onboarding</li>
            </ul>
            <a href={`${SPONSORSHIP_PAGE}#tool-partner`} className="btn btn-success btn-sm w-full">
              <Sparkles className="w-4 h-4" />
              Become a Tool Partner
            </a>
          </article>

          <article className="rounded-2xl border border-primary/30 bg-base-200 p-6 shadow-[0_0_20px_rgba(143,39,224,0.12)]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
              <h3 className="text-xl font-semibold text-base-content">Community Partner</h3>
              <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-primary text-primary-content whitespace-nowrap self-start sm:self-auto">
                $750
              </span>
            </div>
            <p className="text-sm text-base-content/70 mb-4">
              Entry-level cash sponsorship focused on brand visibility and swag.
            </p>
            <ul className="text-sm text-base-content/80 space-y-2 mb-5">
              <li>Logo on event page and stream overlays</li>
              <li>Social media mentions</li>
              <li>Swag distribution</li>
              <li>Discord channel and demo room support</li>
            </ul>
            <a href={`${SPONSORSHIP_PAGE}#community-partner`} className="btn btn-primary btn-sm w-full">
              <Handshake className="w-4 h-4" />
              Become a Community Partner
            </a>
          </article>

          <article className="rounded-2xl border border-warning/40 bg-base-200 p-6 shadow-[0_0_20px_rgba(240,180,40,0.1)]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
              <h3 className="text-xl font-semibold text-base-content">Gold / Platinum</h3>
              <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-warning text-warning-content whitespace-nowrap self-start sm:self-auto">
                $1,500 - $2,000
              </span>
            </div>
            <p className="text-sm text-base-content/70 mb-4">
              Full visibility, speaker slot, and premium access.
            </p>
            <ul className="text-sm text-base-content/80 space-y-2 mb-5">
              <li>Everything in Community Partner</li>
              <li>Speaker slot</li>
              <li>All social posts coverage</li>
              <li>CV access for recruitment (Platinum only)</li>
            </ul>
            <a href={`${SPONSORSHIP_PAGE}#premium-tiers`} className="btn btn-warning btn-sm w-full">
              <Crown className="w-4 h-4" />
              View Premium Tiers
            </a>
          </article>
        </div>

        <div className="text-center mt-6">
          <a href={SPONSORSHIP_PAGE} className="text-primary hover:underline text-sm font-semibold">
            View full sponsorship tier matrix →
          </a>
        </div>
      </div>
    </section>
  );
};

export default SponsorshipPackagesSection;
