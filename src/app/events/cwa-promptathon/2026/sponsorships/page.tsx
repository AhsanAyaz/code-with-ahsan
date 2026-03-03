"use client";

import { SPONSORSHIP_FEATURES } from "../constants";

const Sponsorships = () => {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col gap-10">
      <section className="text-center max-w-4xl mx-auto mt-8">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-primary mb-4">
          Sponsor CWA Prompt-a-thon 2026
        </h1>
        <p className="text-base md:text-lg text-base-content/70">
          Hybrid model: Tool Partner first (credits/licenses), plus cash sponsorship options.
        </p>
      </section>

      <section className="grid lg:grid-cols-2 gap-5 max-w-5xl mx-auto w-full">
        <article className="rounded-2xl border border-primary/30 bg-base-200 p-6">
          <h2 className="text-xl font-bold text-primary mb-2">Tool Partner (Primary)</h2>
          <p className="text-sm text-base-content/70 mb-4">
            Provide API credits or licenses for all participants instead of cash.
          </p>
          <ul className="space-y-2 text-sm text-base-content/80">
            <li>Logo on event page</li>
            <li>Mention in all major social posts</li>
            <li>Dedicated Discord support channel</li>
            <li>Live demo slot during the event</li>
            <li>Product included in onboarding kit</li>
          </ul>
        </article>

        <article className="rounded-2xl border border-primary/15 bg-base-200 p-6">
          <h2 className="text-xl font-bold text-base-content mb-2">Community Partner ($750)</h2>
          <p className="text-sm text-base-content/70 mb-4">
            Lightweight paid option optimized for a 1-day online event.
          </p>
          <ul className="space-y-2 text-sm text-base-content/80">
            <li>Logo on event page and social mentions</li>
            <li>Swag inclusion support</li>
            <li>Product featured in hackathon resources</li>
            <li>Priority verbal mention during kickoff</li>
          </ul>
        </article>
      </section>

      <section className="overflow-x-auto rounded-2xl border border-primary/15 bg-base-200 p-4 sm:p-6">
        <h3 className="text-lg sm:text-xl font-semibold text-primary mb-4">
          Extended Cash Tiers (Optional)
        </h3>
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
      </section>

      <section className="text-center pb-6 text-sm sm:text-base text-base-content/70">
        <p>
          Custom packages available. Contact{" "}
          <a href="mailto:maham.visionwiseab@gmail.com" className="text-primary hover:underline font-semibold">
            maham.visionwiseab@gmail.com
          </a>{" "}
          or{" "}
          <a href="mailto:ahsan.ubitian@gmail.com" className="text-primary hover:underline font-semibold">
            ahsan.ubitian@gmail.com
          </a>
          .
        </p>
      </section>
    </main>
  );
};

export default Sponsorships;
