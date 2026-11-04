import { Linkedin } from "lucide-react";
import { JUDGES, JUDGES_PENDING_COPY, SECTION_IDS } from "../constants";
import KineticHeading from "./KineticHeading";
import LineupReveal from "./LineupReveal";
import PersonAvatar from "./PersonAvatar";
import { CONTAINER, DISPLAY_FONT, FOCUS_RING, SECTION_SPACING } from "./styles";

const JudgesSection = () => {
  return (
    <section id={SECTION_IDS.judges} aria-labelledby="judges-heading" className={SECTION_SPACING}>
      <div className={CONTAINER}>
        <KineticHeading id="judges-heading" text="Pitch judges" className="mb-10" />

        {JUDGES.length === 0 ? (
          <LineupReveal count={3} copy={JUDGES_PENDING_COPY} />
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {JUDGES.map((judge) => (
              <li
                key={judge.name}
                className="flex items-center gap-5 rounded-3xl border border-(--sm-lilac)/20 bg-(--sm-dusk) p-6"
              >
                <PersonAvatar
                  name={judge.name}
                  src={judge.avatarUrl}
                  size={88}
                  className="rounded-full"
                />
                <div className="min-w-0">
                  <h3
                    className={`${DISPLAY_FONT} text-2xl font-bold leading-tight text-(--sm-paper)`}
                  >
                    {judge.name}
                  </h3>
                  <p className="mt-1 text-sm text-(--sm-lilac)">
                    {judge.position}, {judge.company}
                  </p>
                  {judge.linkedinUrl && (
                    <a
                      href={judge.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${judge.name} on LinkedIn`}
                      className={`mt-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-(--sm-lilac)/30 text-(--sm-lilac) hover:text-(--sm-paper) ${FOCUS_RING}`}
                    >
                      <Linkedin className="h-4 w-4" aria-hidden />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};

export default JudgesSection;
