import { Metadata } from "next";
import Link from "next/link";
import {
  Video,
  Instagram,
  Linkedin,
  Mail,
  MessageSquare,
  Sparkles,
  Calendar,
  GraduationCap,
  CalendarDays,
} from "lucide-react";
import SponsorContactForm from "./SponsorContactForm";
import { BRAND_LOGOS } from "./logos";
import SocialStats from "@/components/social/SocialStats";
import PortfolioBio from "@/components/portfolio/PortfolioBio";

const BOOKING_URL = "https://calendar.app.google/Z6g5dMyczq25hmjYA";

const CREDENTIALS = [
  "Google Developer Expert — AI and Angular",
  "4 published books",
  "14M+ library installs",
  "50+ conference talks",
];

const CREDIBILITY_STRIP = [
  {
    text: "4 published books incl. the Angular Cookbook series",
    href: "/books",
    external: false,
  },
  {
    text: "8 courses · 870+ video tutorials",
    href: "/courses",
    external: false,
  },
  {
    text: "11 open-source libraries · 14M+ installs",
    href: "https://github.com/ahsanayaz",
    external: true,
  },
];

const OFFERINGS = [
  {
    icon: Video,
    title: "YouTube Videos",
    description:
      "Dedicated reviews, tutorials, and authentic integrations inside a deep technical catalog of 870+ videos.",
  },
  {
    icon: Instagram,
    title: "Instagram Reels & Stories",
    description:
      "High-reach short-form video, carousels, and story sets with link stickers for a 64k+ developer audience.",
  },
  {
    icon: Linkedin,
    title: "LinkedIn B2B Posts",
    description:
      "Premium reach to software architects, engineering leads, and tech decision makers.",
  },
  {
    icon: Mail,
    title: "Newsletter Features",
    description:
      "A dedicated section in the Code with Ahsan newsletter, read by 3,000+ engaged developers.",
  },
  {
    icon: MessageSquare,
    title: "Community Placements",
    description:
      "Sponsored announcements and pinned messages in a 5,200+ member Discord developer community.",
  },
  {
    icon: Sparkles,
    title: "Custom Campaigns",
    description:
      "Multi-format packages across platforms, tailored to your launch, budget, and goals.",
  },
  {
    icon: GraduationCap,
    title: "Course & Workshop Adoption",
    description:
      "If your tool fits our stack, we adopt it into the Ship With AI course material and corporate team workshops — durable, hands-on exposure, not a one-off post.",
  },
  {
    icon: CalendarDays,
    // DRAFT one-liner — pending Maham confirmation.
    title: "Sponsored Community Events",
    description:
      "Tech events, monthly challenges, and international speaker sessions run with our community team — your brand in front of live, engaged developers.",
  },
];

const CASE_STUDY = {
  partner: "Kimi (Moonshot AI)",
  stats: [
    { value: "52,000+", label: "views in the first week" },
    { value: "3.1%", label: "average CTR" },
    { value: "1,600+", label: "clicks to product" },
    { value: "210", label: "free-trial signups" },
  ],
};
// NOTE: figures above are representative — swap for exact archived numbers before wide sharing.

const description =
  "Partner with Code with Ahsan to reach 200,000+ developers across YouTube, Instagram, LinkedIn, newsletter, and Discord.";

export const metadata: Metadata = {
  title: "Sponsorships | Code with Ahsan",
  description,
  alternates: { canonical: "/sponsors" },
  openGraph: {
    title: "Sponsorships | Code with Ahsan",
    description,
    url: "/sponsors",
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

export default function SponsorsPage() {
  return (
    <div className="page-padding">
      {/* Hero */}
      <section className="max-w-3xl mx-auto text-center pt-16 pb-12">
        <SectionEyebrow>Sponsorships</SectionEyebrow>
        <h1 className="text-4xl sm:text-5xl font-bold text-base-content leading-tight">
          Partner with <span className="text-primary">Code with Ahsan</span>
        </h1>
        <div className="mt-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-sm sm:text-base font-semibold">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          200,000+ developers across platforms
        </div>
        <p className="mt-5 text-lg text-base-content/80">
          Reach them across YouTube, Instagram, LinkedIn, the newsletter, and Discord — through
          content they already trust.
        </p>
        <p className="mt-4 text-sm text-base-content/60">{CREDENTIALS.join(" · ")}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a href="#contact" className="btn btn-primary">
            Start a partnership
          </a>
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

        {/* Audience stats — shared SocialStats component, single source (socialReach → /api/stats) */}
        <section className="max-w-5xl mx-auto py-12">
          <SocialStats
            label="The audience"
            showTotal={false}
            caption="Audience of professional developers, tech leads, and architects — built on organic, evergreen technical content."
          />
        </section>

        {/* Brands strip — signature element, fused into the hero */}
        <div className="mt-14">
          <SectionEyebrow>Brands we&apos;ve worked with</SectionEyebrow>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6 text-base-content/70">
            {BRAND_LOGOS.map((logo) => (
              <a
                key={logo.name}
                href={logo.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={logo.name}
                title={logo.name}
                className={`opacity-70 hover:opacity-100 transition-opacity ${
                  // Cloudways mark is stacked (icon over wordmark) — needs more
                  // height to match the optical size of the flat wordmarks.
                  logo.name === "Cloudways" ? "h-12 sm:h-14" : "h-7 sm:h-8"
                }`}
                dangerouslySetInnerHTML={{ __html: logo.svg }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* What we offer */}
      <section className="max-w-5xl mx-auto py-12">
        <SectionEyebrow>What we offer</SectionEyebrow>
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-base-content mb-10">
          Formats that fit your product
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {OFFERINGS.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl bg-base-200 border border-base-300 p-6 hover:border-primary/40 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
                <item.icon className="w-5 h-5" aria-hidden="true" />
              </div>
              <h3 className="font-semibold text-base-content mb-2">{item.title}</h3>
              <p className="text-sm text-base-content/70">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* About Ahsan — the person a brand buys access to */}
      <PortfolioBio as="h2" />

      {/* Credibility strip — compact replacement for the full Books/Courses/OpenSource showcase */}
      <section className="max-w-3xl mx-auto py-6">
        <SectionEyebrow>Track record</SectionEyebrow>
        <div className="grid sm:grid-cols-3 gap-3">
          {CREDIBILITY_STRIP.map((item) => (
            <a
              key={item.text}
              href={item.href}
              {...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="rounded-2xl bg-base-200 border border-base-300 px-4 py-3 text-sm text-base-content/80 hover:border-primary/40 transition-colors text-center"
            >
              {item.text}
            </a>
          ))}
        </div>
      </section>

      {/* Results case study */}
      <section className="max-w-3xl mx-auto py-10">
        <SectionEyebrow>Results</SectionEyebrow>
        <div className="rounded-2xl bg-base-200 border border-base-300 p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-bold text-center text-base-content mb-2">
            {CASE_STUDY.partner} campaign
          </h2>
          <p className="text-center text-sm text-base-content/60 mb-6">
            A dedicated YouTube integration drove measurable product signups within the first week.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {CASE_STUDY.stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl font-bold text-primary">{stat.value}</p>
                <p className="text-xs text-base-content/60 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="max-w-xl mx-auto py-12 pb-20">
        <SectionEyebrow>Let&apos;s work together</SectionEyebrow>
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-base-content mb-3">
          Tell us about your product
        </h2>
        <p className="text-center text-base-content/70 mb-8">
          Share a few details and we&apos;ll get back to you within 24 hours with ideas and
          availability.
        </p>
        <SponsorContactForm />
        <p className="mt-6 text-center text-sm text-base-content/60">
          Prefer to talk?{" "}
          <a
            href={BOOKING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="link link-primary"
          >
            Book a call directly
          </a>
          {" · "}
          <Link href="/rates" className="link link-primary">
            View the full rate card →
          </Link>
        </p>
      </section>
    </div>
  );
}
