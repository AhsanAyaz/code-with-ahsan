"use client";

import LegitMarkdown from "@/components/LegitMarkdown";
import ResourcesLinks from "@/components/ResourcesLinks";

const CREDENTIAL_PILLS = [
  "Google Developer Expert — AI and Angular",
  "4 published books",
  "13M+ library installs",
  "50+ conference talks",
  "Flat fee only — no commissions",
];

const STATS = [
  { label: "YouTube", value: "34k+", sub: "Subscribers" },
  { label: "Instagram", value: "64k+", sub: "Followers" },
  { label: "Discord", value: "4,400+", sub: "Devs" },
  { label: "Newsletter", value: "2,100+", sub: "Subscribers" },
];

const FEATURED_PACKAGES = [
  {
    name: "Awareness",
    price: "$1,850",
    savings: "Save $100",
    badge: null,
    description: "Best for product launches.",
    deliverables: [
      "Instagram Reel (up to 90s)",
      "Story set x3 (with link sticker)",
      "Collaborator tag for co-branding",
      "12-month organic license included",
    ],
  },
  {
    name: "Growth",
    price: "$4,000",
    savings: "Save $400",
    badge: "Most popular",
    description: "Two dedicated YouTube videos with maximum organic reach.",
    deliverables: [
      "2x Dedicated Full-Length YouTube Videos (5-10 min)",
      "Prominent links in description and pinned comment",
      "End-screen card on each video",
      "12-month organic license included",
    ],
  },
  {
    name: "Authority",
    price: "$5,500",
    savings: "Save $1,100",
    badge: null,
    description: "Maximum reach across video, email, and community.",
    deliverables: [
      "3x Dedicated Full-Length YouTube Videos (5-10 min)",
      "Newsletter feature (dedicated slot)",
      "Discord announcement + 7-day pin",
      "12-month organic license included",
    ],
  },
];

export default function RatesClient({ post }: { post: any }) {
  return (
    <div className="page-padding relative">
      {/* === HERO === */}
      <header className="mb-10 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold mb-4 leading-tight">
          Reach 170,000+ developers who build for a living
        </h1>
        <p className="text-lg text-gray-300 max-w-3xl mx-auto mb-6">
          Muhammad Ahsan Ayaz&apos;s audience includes software architects, senior engineers, and developers at companies like Klarna, Scania, and Google. Ahsan is a Google Developer Expert in AI and Angular, author of 4 published books, and creator of open-source libraries with 13M+ installs.
        </p>
        {/* Credential pills */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {CREDENTIAL_PILLS.map((pill) => (
            <span
              key={pill}
              className="px-3 py-1 rounded-full border border-yellow-400 text-yellow-300 text-sm font-medium"
            >
              {pill}
            </span>
          ))}
        </div>
        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="bg-white/5 rounded-xl p-4 text-center border border-white/10"
            >
              <div className="text-2xl font-bold text-yellow-300">{stat.value}</div>
              <div className="text-sm font-semibold">{stat.label}</div>
              <div className="text-xs text-gray-400">{stat.sub}</div>
            </div>
          ))}
        </div>
      </header>

      {/* === FEATURED PACKAGES === */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6 text-center">Featured packages</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FEATURED_PACKAGES.map((pkg) => (
            <div
              key={pkg.name}
              className={`relative rounded-2xl border p-6 flex flex-col ${
                pkg.badge
                  ? "border-yellow-400 bg-yellow-400/5"
                  : "border-white/10 bg-white/5"
              }`}
            >
              {pkg.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-black text-xs font-bold px-3 py-1 rounded-full">
                  {pkg.badge}
                </span>
              )}
              <div className="mb-4">
                <h3 className="text-xl font-bold">{pkg.name}</h3>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold text-yellow-300">{pkg.price}</span>
                  <span className="text-sm text-green-400">({pkg.savings})</span>
                </div>
                <p className="text-sm text-gray-400 mt-2">{pkg.description}</p>
              </div>
              <ul className="space-y-2 flex-1">
                {pkg.deliverables.map((d) => (
                  <li key={d} className="flex items-start gap-2 text-sm">
                    <span className="text-green-400 mt-0.5">✓</span>
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* === A LA CARTE MARKDOWN === */}
      {post.article && (
        <section>
          <LegitMarkdown
            components={{
              a: (props: any) => (
                <a
                  className="text-yellow-300"
                  target={"_blank"}
                  rel="noreferrer"
                  {...props}
                >
                  {props.children}
                </a>
              ),
            }}
          >
            {post.article}
          </LegitMarkdown>
        </section>
      )}

      {post.resources?.length > 0 && (
        <section className="mt-4">
          <ResourcesLinks
            resources={post.resources}
            heading="Resources"
            noHeading={false}
          />
        </section>
      )}

      {/* === CLOSING CTA === */}
      <section className="mt-16 mb-24 text-center rounded-2xl border border-yellow-400/30 bg-yellow-400/5 p-10">
        <h2 className="text-3xl font-bold mb-4">Ready to reach developers who ship?</h2>
        <p className="text-gray-300 max-w-xl mx-auto mb-8">
          Send a brief with your product, platform, timeline, and budget. Flat fee only — no commissions or performance-based arrangements.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="mailto:ahsan.ubitian@gmail.com?subject=Collaboration%20Inquiry%20%E2%80%94%20%5BYour%20Brand%5D"
            className="inline-block px-8 py-3 bg-yellow-400 text-black font-bold rounded-lg hover:bg-yellow-300 transition-colors"
          >
            Send a brief
          </a>
          <a
            href="https://calendar.app.google/Z6g5dMyczq25hmjYA"
            target="_blank"
            rel="noreferrer"
            className="inline-block px-8 py-3 border border-yellow-400 text-yellow-300 font-bold rounded-lg hover:bg-yellow-400/10 transition-colors"
          >
            Book a call
          </a>
        </div>
      </section>

      {/* === FLOATING CTA — desktop sidebar button === */}
      <a
        href="https://calendar.app.google/Z6g5dMyczq25hmjYA"
        target="_blank"
        rel="noreferrer"
        className="hidden lg:flex fixed right-6 top-1/2 -translate-y-1/2 z-50 flex-col items-center gap-1 bg-yellow-400 text-black font-bold px-3 py-5 rounded-full shadow-lg hover:bg-yellow-300 transition-colors"
        style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
      >
        Book a call
      </a>

      {/* === FIXED BOTTOM BAR — mobile === */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-black/90 backdrop-blur border-t border-yellow-400/30 p-3">
        <a
          href="https://calendar.app.google/Z6g5dMyczq25hmjYA"
          target="_blank"
          rel="noreferrer"
          className="block w-full text-center py-3 bg-yellow-400 text-black font-bold rounded-lg hover:bg-yellow-300 transition-colors"
        >
          Book a call
        </a>
      </div>
    </div>
  );
}
