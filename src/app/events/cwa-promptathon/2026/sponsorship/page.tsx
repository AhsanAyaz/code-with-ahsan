import { SPONSORSHIP_FEATURES, SPONSOR_STATS } from "../constants";

const SponsorshipPage = () => {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col gap-10">
      <section className="text-center max-w-5xl mx-auto mt-6">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-primary mb-4">
          Sponsor CWA Prompt-A-Thon 2026
        </h1>
        <p className="text-base md:text-lg text-base-content/70 mb-3">
          28 March 2026 | 1-Day AI Hackathon | 50 Developers | Discord-Native
        </p>
        <p className="text-sm md:text-base text-base-content/70 max-w-4xl mx-auto">
          We are prioritizing tool partners and lightweight cash sponsorships for this event.
          Our goal is to get usable tools and credits into participants&apos; hands so they build
          better demos and put your brand in front of the developers using them.
        </p>
      </section>

      <section id="tool-partner" className="rounded-2xl border border-success/35 bg-base-200 p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-2xl font-bold text-success">Tool Partner</h2>
          <span className="badge badge-success">Primary - No Cash Required</span>
        </div>
        <ul className="space-y-2 text-sm sm:text-base text-base-content/80">
          <li>API credits or licenses provided to all 50 participants</li>
          <li>Logo on event page and all social media coverage</li>
          <li>Dedicated Discord channel for your team during the event</li>
          <li>Live demo room slot (15 mins)</li>
          <li>Product featured in participant onboarding email and materials</li>
          <li>Mention in post-event recap</li>
        </ul>
        <p className="text-sm text-base-content/70 mt-4">
          No procurement process. One email confirmation is enough.
        </p>
      </section>

      <section id="community-partner" className="rounded-2xl border border-primary/30 bg-base-200 p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-2xl font-bold text-primary">Community Partner</h2>
          <span className="badge badge-primary">$750</span>
        </div>
        <ul className="space-y-2 text-sm sm:text-base text-base-content/80">
          <li>Logo on event page and stream overlays</li>
          <li>2-3 dedicated social media posts</li>
          <li>Swag distribution to participants</li>
          <li>Dedicated Discord channel and demo room</li>
          <li>Product used in hackathon if credits provided</li>
        </ul>
        <p className="text-sm text-base-content/70 mt-4">
          Recommended for companies wanting brand visibility and swag distribution without a large commitment.
        </p>
      </section>

      <section id="premium-tiers" className="rounded-2xl border border-warning/35 bg-base-200 p-4 sm:p-6">
        <h2 className="text-2xl font-bold text-warning mb-4">Premium Tiers</h2>
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full text-sm">
            <thead>
              <tr>
                <th>Feature</th>
                <th className="text-primary">Community Partner ($750)</th>
                <th className="text-warning">Gold ($1,500)</th>
                <th className="text-yellow-300">Platinum ($2,000)</th>
              </tr>
            </thead>
            <tbody>
              {SPONSORSHIP_FEATURES.map((feature) => (
                <tr key={feature.name}>
                  <td>{feature.name}</td>
                  <td>{feature.community}</td>
                  <td>{feature.gold}</td>
                  <td>{feature.platinum}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid md:grid-cols-2 gap-5">
        <article className="rounded-2xl border border-primary/20 bg-base-200 p-6">
          <p className="text-xs uppercase tracking-wider text-base-content/60 mb-2">Primary Contact</p>
          <h3 className="text-xl font-semibold text-base-content">Maham Tahir</h3>
          <a
            href="mailto:maham.tahir@visionwise.solutions"
            className="text-primary hover:underline text-sm sm:text-base"
          >
            maham.tahir@visionwise.solutions
          </a>
        </article>
        <article className="rounded-2xl border border-primary/20 bg-base-200 p-6">
          <p className="text-xs uppercase tracking-wider text-base-content/60 mb-2">Secondary Contact</p>
          <h3 className="text-xl font-semibold text-base-content">Muhammad Ahsan Ayaz</h3>
          <a
            href="mailto:ahsan.ubitian@gmail.com"
            className="text-primary hover:underline text-sm sm:text-base"
          >
            ahsan.ubitian@gmail.com
          </a>
        </article>
      </section>

      <section className="text-center text-sm text-base-content/70 -mt-5">
        Custom packages available. If none of the above tiers fit your goals, reach out directly.
      </section>

      <section className="rounded-2xl border border-primary/15 bg-base-200 p-5">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {SPONSOR_STATS.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-primary/10 bg-base-100 p-3 text-center"
            >
              <div className="text-lg sm:text-2xl font-bold text-primary">{stat.value}</div>
              <div className="text-[11px] sm:text-xs text-base-content/70 mt-1 uppercase tracking-wider">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
};

export default SponsorshipPage;
