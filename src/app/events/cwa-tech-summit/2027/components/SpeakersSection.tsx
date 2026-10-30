import { Linkedin } from "lucide-react";
import { SECTION_IDS, SPEAKERS, SPEAKERS_PENDING_COPY } from "../constants";
import KineticHeading from "./KineticHeading";
import LineupReveal from "./LineupReveal";
import PersonAvatar from "./PersonAvatar";
import { CONTAINER, DISPLAY_FONT, FOCUS_RING, SECTION_SPACING } from "./styles";

const SpeakersSection = () => {
  return (
    <section
      id={SECTION_IDS.speakers}
      aria-labelledby="speakers-heading"
      className={SECTION_SPACING}
    >
      <div className={CONTAINER}>
        <KineticHeading id="speakers-heading" text="Speakers" className="mb-10" />

        {SPEAKERS.length === 0 ? (
          <LineupReveal copy={SPEAKERS_PENDING_COPY} />
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {SPEAKERS.map((speaker) => (
              <li
                key={speaker.name}
                className="flex flex-col rounded-3xl border border-(--sm-lilac)/20 bg-(--sm-dusk) p-6"
              >
                <PersonAvatar
                  name={speaker.name}
                  src={speaker.avatarUrl}
                  size={96}
                  className="rounded-2xl"
                />
                <h3
                  className={`${DISPLAY_FONT} mt-5 text-2xl font-bold leading-tight text-(--sm-paper)`}
                >
                  {speaker.name}
                </h3>
                <p className="mt-1 text-sm text-(--sm-lilac)">
                  {speaker.role}, {speaker.company}
                </p>
                {speaker.talkTitle && (
                  <p className="mt-4 leading-snug text-(--sm-paper)">{speaker.talkTitle}</p>
                )}
                {speaker.linkedinUrl && (
                  <a
                    href={speaker.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`mt-auto inline-flex items-center gap-2 pt-5 text-sm font-medium text-(--sm-lilac) hover:text-(--sm-paper) ${FOCUS_RING}`}
                  >
                    <Linkedin className="h-4 w-4" aria-hidden />
                    {speaker.name} on LinkedIn
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};

export default SpeakersSection;
