import Image from "next/image";
import { Handshake } from "lucide-react";
import {
  COLLABORATION_PARTNERS,
  SECTION_IDS,
  TBD_AVATAR,
  type CollaborationPartner,
} from "../constants";

// Server Component: static markup only, hover states handled in CSS.

const TILE_CLASS =
  "group flex w-[calc(50%-0.5rem)] max-w-[260px] flex-col items-center justify-center gap-4 rounded-2xl border border-primary/15 bg-base-200 p-5 text-center transition-all duration-300 sm:w-[calc(33.333%-0.667rem)] lg:w-[calc(25%-0.75rem)]";

const PartnerTile = ({ partner }: { partner: CollaborationPartner }) => {
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

const CollaborationPartnersSection = () => {
  if (COLLABORATION_PARTNERS.length === 0) return null;

  return (
    <section
      id={SECTION_IDS.collaborationPartners}
      className="relative overflow-hidden pb-16 sm:pb-24"
    >
      <div className="container relative z-10 mx-auto px-4 sm:px-6">
        <div className="mb-8 text-center">
          <div className="mb-3 flex items-center justify-center gap-2">
            <Handshake className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold text-primary sm:text-3xl">Collaboration Partners</h2>
          </div>
          <p className="mx-auto max-w-2xl text-sm text-base-content/70 sm:text-base">
            Communities and organisations helping us put the day together.
          </p>
        </div>

        <div className="mx-auto flex max-w-5xl flex-wrap items-stretch justify-center gap-4">
          {COLLABORATION_PARTNERS.map((partner) =>
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
      </div>
    </section>
  );
};

export default CollaborationPartnersSection;
