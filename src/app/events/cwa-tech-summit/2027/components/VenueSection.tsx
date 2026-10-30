import { ExternalLink, MapPin } from "lucide-react";
import { COMMUNITY_DISCORD_URL, EVENT, SECTION_IDS, VENUE } from "../constants";
import KineticHeading from "./KineticHeading";
import { BUTTON_SECONDARY, CONTAINER, DISPLAY_FONT, SECTION_SPACING } from "./styles";

const VenueSection = () => {
  const confirmed = Boolean(VENUE.name);

  return (
    <section id={SECTION_IDS.venue} aria-labelledby="venue-heading" className={SECTION_SPACING}>
      <div className={CONTAINER}>
        <KineticHeading id="venue-heading" text="The venue" className="mb-10" />

        <div className="flex flex-col gap-8 rounded-3xl border border-(--sm-lilac)/20 bg-(--sm-dusk)/70 p-7 sm:p-10 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-5">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-(--sm-amber)/15 text-(--sm-amber)">
              <MapPin className="h-7 w-7" aria-hidden />
            </span>
            <div>
              <p
                className={`${DISPLAY_FONT} text-4xl font-extrabold leading-none text-(--sm-paper)`}
              >
                {confirmed ? VENUE.name : "Venue announced soon"}
              </p>
              {confirmed && VENUE.addressLines.length > 0 ? (
                <address className="mt-3 not-italic leading-relaxed text-(--sm-paper)/80">
                  {VENUE.addressLines.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </address>
              ) : (
                <p className="mt-3 max-w-xl leading-relaxed text-(--sm-paper)/80">
                  {confirmed
                    ? `${VENUE.city}, ${EVENT.dateLabel}.`
                    : `On-site in ${VENUE.city}, ${EVENT.dateLabel}. We announce the venue on Discord first.`}
                </p>
              )}
            </div>
          </div>

          {confirmed && VENUE.mapUrl ? (
            <a
              href={VENUE.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={BUTTON_SECONDARY}
            >
              <ExternalLink className="h-4 w-4" aria-hidden />
              Get directions
            </a>
          ) : (
            !confirmed && (
              <a
                href={COMMUNITY_DISCORD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={BUTTON_SECONDARY}
              >
                Join the Discord
              </a>
            )
          )}
        </div>
      </div>
    </section>
  );
};

export default VenueSection;
