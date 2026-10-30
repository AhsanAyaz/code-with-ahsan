import { Check, Minus } from "lucide-react";
import {
  BENEFIT_ROWS,
  EVENT,
  SECTION_IDS,
  SPONSOR_FORM_URL,
  SPONSOR_TIERS,
  TIERS_NOTE,
  sponsorMailto,
  type BenefitValue,
  type SponsorTier,
  type TierBadge,
} from "../constants";
import KineticHeading from "./KineticHeading";
import { CONTAINER, DISPLAY_FONT, FOCUS_RING, SECTION_SPACING } from "./styles";

const BenefitCell = ({ value }: { value: BenefitValue }) => {
  if (value === true) {
    return (
      <>
        <Check className="h-5 w-5 text-(--sm-amber)" aria-hidden />
        <span className="sr-only">Included</span>
      </>
    );
  }
  if (value === false) {
    return (
      <>
        <Minus className="h-5 w-5 text-(--sm-lilac)/40" aria-hidden />
        <span className="sr-only">Not included</span>
      </>
    );
  }
  return <span>{value}</span>;
};

const ctaLabel = (tier: SponsorTier) =>
  tier.key === "title" ? "Apply for Title" : `Choose ${tier.name}`;

/**
 * Tier buttons open the sponsor application form in a new tab once
 * SPONSOR_FORM_URL is set; until then they fall back to an email.
 */
const ctaLinkProps = (tier: SponsorTier) =>
  SPONSOR_FORM_URL
    ? { href: SPONSOR_FORM_URL, target: "_blank", rel: "noopener noreferrer" }
    : { href: sponsorMailto(`${tier.name} sponsorship, ${EVENT.name}`) };

const BADGE_TONES: Record<TierBadge["tone"], string> = {
  amber: "bg-(--sm-amber) text-(--sm-ink)",
  lilac: "bg-(--sm-lilac) text-(--sm-ink)",
};

const Badge = ({ badge }: { badge: TierBadge }) => (
  <span
    className={`mt-2 inline-block w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE_TONES[badge.tone]}`}
  >
    {badge.label}
  </span>
);

const Price = ({ tier, large }: { tier: SponsorTier; large?: boolean }) => (
  <div>
    <p className="text-sm text-(--sm-lilac)">PKR</p>
    <p
      className={`${DISPLAY_FONT} font-black leading-none text-(--sm-paper) ${
        large ? "text-5xl" : "text-[1.875rem] 2xl:text-4xl"
      }`}
    >
      {tier.pricePkr}
    </p>
    <p className="mt-1 text-sm text-(--sm-paper)/70">{tier.priceUsd}</p>
  </div>
);

/**
 * xl+: tiers as columns in one grid. Every tier card is a subgrid over the same
 * row tracks as the label column, so each row is as tall as its tallest cell
 * and rows line up across all columns. Nothing moves on hover or focus: the
 * border turns amber and the card lightens.
 */
const Matrix = () => {
  const rowCount = 2 + BENEFIT_ROWS.length + 1; // name, price, benefits, CTA
  // Dividers sit on the inset content (mx-6), so they never run into the gap.
  const cell =
    "mx-6 flex min-w-0 items-center border-t border-(--sm-lilac)/15 py-4 text-sm leading-snug";
  const labelCell =
    "flex items-center border-t border-(--sm-lilac)/15 py-4 pr-3 text-sm leading-snug";

  return (
    <div
      className="hidden gap-x-5 xl:grid xl:grid-cols-[10rem_repeat(5,minmax(0,1fr))]"
      style={{ gridTemplateRows: `repeat(${rowCount}, auto)` }}
    >
      {/* Row labels */}
      {/* Transparent 1px border matches the tier cards' border so row lines align exactly. */}
      <div
        aria-hidden
        className="row-span-full grid grid-rows-subgrid border border-transparent text-(--sm-lilac)"
      >
        <div />
        <div className={`${labelCell} text-base`}>Price</div>
        {BENEFIT_ROWS.map((row) => (
          <div key={row.key} className={labelCell}>
            {row.label}
          </div>
        ))}
        <div />
      </div>

      {SPONSOR_TIERS.map((tier) => {
        const isTitle = tier.key === "title";
        return (
          <div
            key={tier.key}
            role="group"
            aria-label={`${tier.name} tier`}
            className={`group relative row-span-full grid grid-rows-subgrid rounded-3xl border transition-colors duration-300 hover:border-(--sm-amber) focus-within:border-(--sm-amber) ${
              isTitle
                ? "border-(--sm-amber)/70 bg-gradient-to-b from-(--sm-amber)/20 via-(--sm-dusk) via-35% to-(--sm-dusk) shadow-[0_-12px_40px_-18px_var(--sm-amber)]"
                : "border-(--sm-lilac)/15 bg-(--sm-dusk)/60 hover:bg-(--sm-dusk) focus-within:bg-(--sm-dusk)"
            }`}
          >
            <div className="px-6 pb-4 pt-6">
              <h3
                className={`${DISPLAY_FONT} text-3xl font-extrabold leading-none text-(--sm-paper)`}
              >
                {tier.name}
              </h3>
              {tier.badge && <Badge badge={tier.badge} />}
            </div>
            <div className={cell}>
              <span className="sr-only">Price: </span>
              <Price tier={tier} />
            </div>
            {BENEFIT_ROWS.map((row) => (
              <div key={row.key} className={`${cell} text-(--sm-paper)/90`}>
                <span className="sr-only">{row.label}: </span>
                <BenefitCell value={tier.benefits[row.key]} />
              </div>
            ))}
            <div className="mx-6 border-t border-(--sm-lilac)/15 py-5">
              {/* Short visible label: the column header already names the tier,
                  and "Choose Platinum" would not fit the column. */}
              <a
                {...ctaLinkProps(tier)}
                aria-label={ctaLabel(tier)}
                className={`inline-flex w-full items-center justify-center whitespace-nowrap rounded-full px-3 py-2.5 text-sm font-semibold transition-colors ${
                  isTitle
                    ? "bg-(--sm-amber) text-(--sm-ink) hover:bg-(--sm-amber)/85"
                    : "border border-(--sm-lilac)/40 text-(--sm-paper) group-hover:border-(--sm-amber) hover:bg-(--sm-lilac)/10"
                } ${FOCUS_RING}`}
              >
                {tier.key === "title" ? "Apply" : "Choose"}
              </a>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/** Below xl: one card per tier in a horizontal snap scroller, every benefit listed. */
const Cards = () => (
  <div className="xl:hidden">
    <p className="mb-3 text-sm text-(--sm-lilac)">Swipe to compare all five tiers.</p>
    <ul
      tabIndex={0}
      aria-label="Sponsorship tiers"
      className={`-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:scroll-px-6 sm:px-6 ${FOCUS_RING}`}
    >
      {SPONSOR_TIERS.map((tier) => {
        const isTitle = tier.key === "title";
        return (
          <li
            key={tier.key}
            className={`flex w-[84%] max-w-sm shrink-0 snap-start flex-col last:snap-end rounded-3xl border p-6 ${
              isTitle
                ? "border-(--sm-amber)/50 bg-gradient-to-b from-(--sm-amber)/15 via-(--sm-dusk) to-(--sm-dusk)"
                : "border-(--sm-lilac)/20 bg-(--sm-dusk)"
            }`}
          >
            <h3
              className={`${DISPLAY_FONT} text-4xl font-extrabold leading-none text-(--sm-paper)`}
            >
              {tier.name}
            </h3>
            {tier.badge && <Badge badge={tier.badge} />}
            <div className="mt-5">
              <Price tier={tier} large />
            </div>
            <dl className="mt-5 divide-y divide-(--sm-lilac)/15 border-t border-(--sm-lilac)/15">
              {BENEFIT_ROWS.map((row) => (
                <div
                  key={row.key}
                  className="grid grid-cols-[8.5rem_minmax(0,1fr)] gap-3 py-2.5 text-sm"
                >
                  <dt className="text-(--sm-lilac)">{row.label}</dt>
                  <dd className="flex items-start text-(--sm-paper)">
                    <BenefitCell value={tier.benefits[row.key]} />
                  </dd>
                </div>
              ))}
            </dl>
            <div className="mt-auto pt-6">
              <a
                {...ctaLinkProps(tier)}
                className={`inline-flex w-full items-center justify-center rounded-full px-4 py-3 text-sm font-semibold ${
                  isTitle
                    ? "bg-(--sm-amber) text-(--sm-ink)"
                    : "border border-(--sm-lilac)/40 text-(--sm-paper)"
                } ${FOCUS_RING}`}
              >
                {ctaLabel(tier)}
              </a>
            </div>
          </li>
        );
      })}
    </ul>
  </div>
);

const SponsorshipTiersSection = () => {
  return (
    <section
      id={SECTION_IDS.sponsorshipTiers}
      aria-labelledby="tiers-heading"
      className={`${SECTION_SPACING} scroll-mt-24`}
    >
      <div className={CONTAINER}>
        <div className="mb-12 max-w-3xl">
          <KineticHeading id="tiers-heading" text="Sponsorship tiers" />
          <p className="mt-5 text-lg leading-relaxed text-(--sm-paper)/85">
            Put your team in front of Karachi&apos;s developers, founders and students. Every tier
            includes attendee passes and social posts; the top three add a keynote, a panel seat and
            a booth.
          </p>
          <p className="mt-3 text-sm text-(--sm-lilac)">{TIERS_NOTE}</p>
        </div>

        <Matrix />
        <Cards />
      </div>
    </section>
  );
};

export default SponsorshipTiersSection;
