import Image from "next/image";
import { Award } from "lucide-react";
import { CONFIRMED_SPONSORS, SECTION_IDS, type ConfirmedSponsor } from "../constants";

// Server Component: static markup only, hover states handled in CSS.

const TIER_COLORS: Record<string, string> = {
  "Tool Partner": "text-success",
  "Community Partner": "text-primary",
  "Gold Sponsor": "text-warning",
  Gold: "text-warning",
  "Platinum Sponsor": "text-yellow-300",
  Platinum: "text-yellow-300",
  "Title Sponsor": "text-yellow-300",
};
const tierColor = (tier: string) => TIER_COLORS[tier] ?? "text-primary";

const SponsorTile = ({ sponsor }: { sponsor: ConfirmedSponsor }) => (
  <a
    href={sponsor.websiteUrl}
    target="_blank"
    rel="noopener noreferrer"
    className="group flex w-full max-w-[300px] flex-col items-center justify-center gap-4 rounded-2xl border border-primary/15 bg-base-200 p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_0_32px_rgba(143,39,224,0.22)] sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.667rem)]"
  >
    {/* Intrinsic sizing keeps a wide wordmark short instead of padding it into
        a square, so the label sits directly beneath the logo. */}
    <Image
      src={sponsor.logoUrl}
      alt={`${sponsor.name} logo`}
      width={400}
      height={400}
      unoptimized
      className="h-auto max-h-[120px] w-full max-w-[220px] object-contain transition-transform duration-300 group-hover:scale-[1.04]"
    />
    <span className="flex flex-col gap-1">
      <span className="text-sm font-semibold leading-tight text-base-content/90">
        {sponsor.name}
      </span>
      <span className={`font-mono text-[11px] uppercase tracking-wider ${tierColor(sponsor.tier)}`}>
        {sponsor.tier}
      </span>
    </span>
  </a>
);

const CurrentSponsorsSection = () => {
  if (CONFIRMED_SPONSORS.length === 0) return null;

  return (
    <section id={SECTION_IDS.sponsors} className="relative overflow-hidden pb-12 sm:pb-16">
      <div className="container relative z-10 mx-auto px-4 sm:px-6">
        <div className="mb-8 text-center">
          <div className="mb-3 flex items-center justify-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold text-primary sm:text-3xl">Our Sponsors</h2>
          </div>
          <p className="mx-auto max-w-2xl text-sm text-base-content/70 sm:text-base">
            Backing the builders who ship. Proudly supported by our partners.
          </p>
        </div>

        <div className="mx-auto flex max-w-5xl flex-wrap items-stretch justify-center gap-4">
          {CONFIRMED_SPONSORS.map((sponsor) => (
            <SponsorTile key={sponsor.name} sponsor={sponsor} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default CurrentSponsorsSection;
