import Image from "next/image";
import { TBD_AVATAR, type PartnerLogo } from "../constants";

// Server Component: static markup only, hover states handled in CSS.
// Shared by the Collaboration and Outreach partner sections so both groups
// render identically.

const TILE_CLASS =
  "group flex w-[calc(50%-0.5rem)] max-w-[260px] flex-col items-center justify-center gap-4 rounded-2xl border border-primary/15 bg-base-200 p-5 text-center transition-all duration-300 sm:w-[calc(33.333%-0.667rem)] lg:w-[calc(25%-0.75rem)]";

const PartnerTile = ({ partner }: { partner: PartnerLogo }) => {
  const isPlaceholder = partner.logoUrl === TBD_AVATAR;

  return (
    <>
      {/* Intrinsic sizing: the logo renders up to 200px wide and keeps its own
          aspect ratio, so a wide banner stays short and the label sits directly
          beneath it instead of below a half-empty square. */}
      <Image
        src={partner.logoUrl}
        alt={`${partner.name} logo`}
        width={400}
        height={400}
        unoptimized
        className={`h-auto max-h-[200px] w-full max-w-[200px] rounded-xl object-contain transition-transform duration-300 group-hover:scale-[1.04] ${
          isPlaceholder ? "opacity-60" : ""
        }`}
      />
      <span className="text-sm font-semibold leading-tight text-base-content/90">
        {partner.name}
      </span>
    </>
  );
};

const PartnerGrid = ({ partners }: { partners: PartnerLogo[] }) => (
  <div className="mx-auto flex max-w-5xl flex-wrap items-stretch justify-center gap-4">
    {partners.map((partner) =>
      partner.websiteUrl ? (
        <a
          key={partner.name}
          href={partner.websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`${TILE_CLASS} hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_0_28px_rgba(143,39,224,0.2)]`}
        >
          <PartnerTile partner={partner} />
        </a>
      ) : (
        <div key={partner.name} className={TILE_CLASS}>
          <PartnerTile partner={partner} />
        </div>
      )
    )}
  </div>
);

export default PartnerGrid;
