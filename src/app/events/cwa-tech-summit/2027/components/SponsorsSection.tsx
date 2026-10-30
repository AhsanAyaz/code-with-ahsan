import Image from "next/image";
import {
  CONFIRMED_SPONSORS,
  SECTION_IDS,
  SPONSOR_TIERS,
  type ConfirmedSponsor,
} from "../constants";
import KineticHeading from "./KineticHeading";
import { CONTAINER, FOCUS_RING, SECTION_SPACING } from "./styles";

const SponsorLogo = ({ sponsor }: { sponsor: ConfirmedSponsor }) => {
  const logo = (
    <Image
      src={sponsor.logoUrl}
      alt={sponsor.name}
      width={200}
      height={80}
      unoptimized
      className="h-14 w-auto max-w-full object-contain"
    />
  );
  return sponsor.websiteUrl ? (
    <a
      href={sponsor.websiteUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center justify-center ${FOCUS_RING}`}
    >
      {logo}
    </a>
  ) : (
    logo
  );
};

/**
 * Confirmed sponsors only, grouped by tier in tier order. Renders nothing
 * until the first sponsor is added to CONFIRMED_SPONSORS: no empty boxes and
 * no count of what is still available.
 */
const SponsorsSection = () => {
  const groups = SPONSOR_TIERS.map((tier) => ({
    tier,
    sponsors: CONFIRMED_SPONSORS.filter((s) => s.tier === tier.key),
  })).filter((group) => group.sponsors.length > 0);

  if (groups.length === 0) return null;

  return (
    <section
      id={SECTION_IDS.sponsors}
      aria-labelledby="sponsors-heading"
      className={SECTION_SPACING}
    >
      <div className={CONTAINER}>
        <KineticHeading id="sponsors-heading" text="Our sponsors" />

        <div className="mt-10 space-y-10">
          {groups.map(({ tier, sponsors }) => (
            <div key={tier.key}>
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-(--sm-lilac)">
                {tier.name}
              </h3>
              <ul className="mt-4 flex flex-wrap gap-3 sm:gap-4">
                {sponsors.map((sponsor) => (
                  <li
                    key={sponsor.name}
                    className={`flex items-center justify-center rounded-2xl border border-(--sm-lilac)/25 bg-(--sm-paper) p-5 ${
                      tier.key === "title"
                        ? "h-32 w-full sm:w-96"
                        : "h-24 w-[calc(50%-0.375rem)] sm:w-56"
                    }`}
                  >
                    <SponsorLogo sponsor={sponsor} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SponsorsSection;
