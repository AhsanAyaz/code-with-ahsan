import { Metadata } from "next";
import Link from "next/link";
import { Calendar, Send, CheckCircle2 } from "lucide-react";
import SocialStats from "@/components/social/SocialStats";

const BOOKING_URL = "https://calendar.app.google/Z6g5dMyczq25hmjYA";

const CREDENTIAL_PILLS = [
  "Google Developer Expert — AI and Angular",
  "4 published books",
  "14M+ library installs",
  "50+ conference talks",
  "Flat fee only — no commissions",
];

type FeaturedPackage = {
  name: string;
  originalPrice: string;
  price: string;
  save: string;
  mostPopular?: boolean;
  deliverables: string[];
};

const FEATURED_PACKAGES: FeaturedPackage[] = [
  {
    name: "Instagram Launch",
    originalPrice: "$1,950",
    price: "$1,850",
    save: "Save $100",
    deliverables: [
      "Instagram Reel (up to 90s)",
      "Story set x3 (with link sticker)",
      "Collaborator tag for co-branding",
      "12-month organic license included",
    ],
  },
  {
    name: "Growth",
    originalPrice: "$5,000",
    price: "$4,750",
    save: "Save $250",
    mostPopular: true,
    deliverables: [
      "2x Dedicated Full-Length YouTube Videos (5–10 min)",
      "Prominent links in description and pinned comment",
      "End-screen card on each video",
      "12-month organic license included",
    ],
  },
  {
    name: "Authority",
    originalPrice: "$8,400",
    price: "$6,400",
    save: "Save $2,000",
    deliverables: [
      "3x Dedicated Full-Length YouTube Videos (5–10 min)",
      "Newsletter feature (dedicated slot)",
      "Discord announcement + 7-day pin",
      "12-month organic license included",
    ],
  },
];

type ALaCarteGroup = {
  platform: string;
  note: string;
  items: { name: string; price: string; description?: string }[];
};

const A_LA_CARTE_GROUPS: ALaCarteGroup[] = [
  {
    platform: "YouTube",
    note: "37k+ subscribers",
    items: [
      {
        name: "Dedicated Long-Form Video (20–30 min)",
        price: "Starting at $3,000",
        description:
          "Detailed review, real-world demos, prominent description mentions, pinned comment, end-screen card",
      },
      {
        name: "Dedicated Full-Length Video (5–10 min)",
        price: "$2,500",
        description:
          "In-depth tutorial/review/integration; prominent links, pinned comment, end-screen card",
      },
      {
        name: "YouTube Short (up to 60s)",
        price: "$900",
        description: "Quick feature highlight / tips / CTA, branded tag + link",
      },
      {
        name: "YouTube Mention/Integration (60–90s segment)",
        price: "$1,500",
        description: "Dedicated segment within a longer video",
      },
    ],
  },
  {
    platform: "Instagram",
    note: "64k+ followers",
    items: [
      {
        name: "Reel (up to 90s)",
        price: "$1,200",
        description: "Collaborator tag, link in bio, caption mention",
      },
      { name: "Static Post / Carousel", price: "$950" },
      { name: "Stories (set of 3, with link sticker)", price: "$750" },
    ],
  },
  {
    platform: "LinkedIn",
    note: "23k+ followers — premium B2B",
    items: [
      { name: "Post (Text + Image/Video Clip)", price: "$1,200" },
      { name: "Article / Long-Form Post", price: "$1,500" },
    ],
  },
  {
    platform: "TikTok",
    note: "10.5k+ followers",
    items: [{ name: "TikTok Video (up to 60s)", price: "$700" }],
  },
  {
    platform: "Newsletter & Community",
    note: "3,000+ subscribers · 5,200+ Discord members",
    items: [
      { name: "Newsletter Feature (dedicated slot in issue)", price: "$500" },
      { name: "Discord Announcement / Pinned Post", price: "$400" },
      { name: "Newsletter + Discord Bundle", price: "$750 (Save $150)" },
    ],
  },
];

const USAGE_RIGHTS = [
  "12-month organic usage license included on all standard rates (client resharing on owned channels/website, full attribution)",
  "Paid Media (Whitelisting) License: +40% of base rate (3-month), +75% (6-month)",
  "Perpetual (Lifetime) Organic Rights: +75% of base rate",
  "Full Buyout (Perpetual Paid & Organic): +150% of base rate",
  "Exclusivity: +25% of base rate per month (category exclusivity)",
  "Raw Footage: +40% of base rate",
];

const description =
  "Flat-fee rate card for sponsoring Code with Ahsan across YouTube, Instagram, LinkedIn, newsletter, and Discord — reach 200,000+ developers.";

export const metadata: Metadata = {
  title: "Rate Card | Code with Ahsan",
  description,
  alternates: { canonical: "/rates" },
  openGraph: {
    title: "Rate Card | Code with Ahsan",
    description,
    url: "/rates",
    type: "website",
  },
};

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-center text-xs font-mono text-base-content/40 uppercase tracking-widest mb-3">
      {children}
    </p>
  );
}

export default function RatesPage() {
  return (
    <div className="page-padding">
      {/* Hero */}
      <section className="max-w-3xl mx-auto text-center pt-16 pb-12">
        <SectionEyebrow>Rate card</SectionEyebrow>
        <h1 className="text-4xl sm:text-5xl font-bold text-base-content leading-tight">
          Reach <span className="text-primary">200,000+ developers</span> who build for a living
        </h1>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {CREDENTIAL_PILLS.map((pill) => (
            <span
              key={pill}
              className="px-3 py-1 rounded-full border border-base-300 bg-base-200 text-xs sm:text-sm text-base-content/70"
            >
              {pill}
            </span>
          ))}
        </div>
        <p className="mt-6 text-sm text-base-content/60">
          Currently accepting 4 brand partnerships per month.
        </p>
      </section>

      {/* Audience */}
      <section className="max-w-5xl mx-auto py-6">
        <SocialStats
          label="The audience"
          showTotal
          caption="Software architects, senior engineers, and developers at top-tier companies."
        />
      </section>

      {/* Featured packages */}
      <section className="max-w-5xl mx-auto py-12">
        <SectionEyebrow>Featured packages</SectionEyebrow>
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-base-content mb-10">
          Bundled campaigns, priced flat
        </h2>
        <div className="grid sm:grid-cols-3 gap-5">
          {FEATURED_PACKAGES.map((pkg) => (
            <div
              key={pkg.name}
              className={`relative rounded-2xl bg-base-200 border p-6 flex flex-col ${
                pkg.mostPopular ? "border-primary/60 shadow-md" : "border-base-300"
              }`}
            >
              {pkg.mostPopular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-content text-xs font-semibold">
                  Most popular
                </span>
              )}
              <h3 className="font-semibold text-lg text-base-content mt-2">{pkg.name}</h3>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-base-content/40 line-through text-sm">
                  {pkg.originalPrice}
                </span>
                <span className="text-2xl font-bold text-primary">{pkg.price}</span>
              </div>
              <span className="mt-1 inline-block text-xs font-semibold text-success">
                {pkg.save}
              </span>
              <ul className="mt-5 space-y-2 flex-1">
                {pkg.deliverables.map((d) => (
                  <li key={d} className="flex items-start gap-2 text-sm text-base-content/70">
                    <CheckCircle2
                      className="w-4 h-4 text-primary shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* A la carte */}
      <section className="max-w-4xl mx-auto py-12">
        <SectionEyebrow>À la carte</SectionEyebrow>
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-base-content mb-10">
          Pick a single format
        </h2>
        <div className="space-y-4">
          {A_LA_CARTE_GROUPS.map((group) => (
            <details
              key={group.platform}
              className="rounded-2xl bg-base-200 border border-base-300 p-5 open:pb-6"
            >
              <summary className="cursor-pointer font-semibold text-base-content flex items-center justify-between">
                <span>
                  {group.platform}{" "}
                  <span className="text-base-content/50 font-normal text-sm">({group.note})</span>
                </span>
              </summary>
              <ul className="mt-4 space-y-3">
                {group.items.map((item) => (
                  <li
                    key={item.name}
                    className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 border-t border-base-300 pt-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-base-content">{item.name}</p>
                      {item.description && (
                        <p className="text-xs text-base-content/60 mt-0.5">{item.description}</p>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-primary whitespace-nowrap">
                      {item.price}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      </section>

      {/* Usage rights & add-ons */}
      <section className="max-w-3xl mx-auto py-12">
        <SectionEyebrow>Usage rights &amp; add-ons</SectionEyebrow>
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-base-content mb-8">
          Extend beyond organic reach
        </h2>
        <div className="rounded-2xl bg-base-200 border border-base-300 p-6">
          <ul className="space-y-3">
            {USAGE_RIGHTS.map((right) => (
              <li key={right} className="flex items-start gap-2 text-sm text-base-content/70">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                <span>{right}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-base-content/50">
            Add-ons are calculated on the base rate of each deliverable.
          </p>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="max-w-xl mx-auto py-12 pb-20 text-center">
        <SectionEyebrow>Ready to reach developers who ship?</SectionEyebrow>
        <h2 className="text-2xl sm:text-3xl font-bold text-base-content mb-3">Send a brief</h2>
        <p className="text-base-content/70 mb-8">
          Share your product, platform, timeline, and budget. Flat fee only — no commissions or
          performance-based arrangements.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/sponsors#contact" className="btn btn-primary">
            <Send className="w-4 h-4" />
            Send a brief
          </Link>
          <a
            href={BOOKING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline"
          >
            <Calendar className="w-4 h-4" />
            Book a call
          </a>
        </div>
      </section>
    </div>
  );
}
