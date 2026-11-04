import { Mic, Trophy, Users } from "lucide-react";
import { ABOUT_INTRO, PILLARS, SECTION_IDS, type Pillar } from "../constants";
import KineticHeading from "./KineticHeading";
import { CONTAINER, DISPLAY_FONT, SECTION_SPACING } from "./styles";

const byKey = (key: Pillar["key"]) => PILLARS.find((pillar) => pillar.key === key);

const AboutSection = () => {
  const pitch = byKey("pitch");
  const talks = byKey("talks");
  const panel = byKey("panel");

  return (
    <section id={SECTION_IDS.about} aria-labelledby="about-heading" className={SECTION_SPACING}>
      <div className={CONTAINER}>
        <div className="max-w-3xl">
          <KineticHeading id="about-heading" text="One day, one stage" />
          <p className="mt-5 text-lg leading-relaxed text-(--sm-paper)/85">{ABOUT_INTRO}</p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-5 lg:grid-rows-2">
          {/* The pitch final carries the day, so it gets the most room. */}
          {pitch && (
            <article className="relative overflow-hidden rounded-3xl border border-(--sm-amber)/40 bg-(--sm-dusk) p-7 sm:p-10 lg:col-span-3 lg:row-span-2">
              <span
                aria-hidden
                className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-(--sm-amber)/15 blur-3xl"
              />
              <Trophy className="h-9 w-9 text-(--sm-amber)" aria-hidden />
              <h3
                className={`${DISPLAY_FONT} mt-6 text-5xl font-extrabold leading-none text-(--sm-paper) sm:text-6xl`}
              >
                {pitch.title}
              </h3>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-(--sm-paper)/85">
                {pitch.body}
              </p>
              <p className="mt-8 flex items-baseline gap-3 text-(--sm-lilac)">
                <span className={`${DISPLAY_FONT} text-6xl font-black text-(--sm-amber)`}>3</span>
                teams pitch live on stage
              </p>
            </article>
          )}

          {talks && (
            <article className="rounded-3xl border border-(--sm-lilac)/20 p-7 lg:col-span-2">
              <div className="flex items-center gap-3">
                <Mic className="h-6 w-6 text-(--sm-lilac)" aria-hidden />
                <h3 className={`${DISPLAY_FONT} text-3xl font-bold leading-none text-(--sm-paper)`}>
                  {talks.title}
                </h3>
              </div>
              <p className="mt-4 leading-relaxed text-(--sm-paper)/80">{talks.body}</p>
            </article>
          )}

          {panel && (
            <article className="rounded-3xl bg-(--sm-violet)/20 p-7 lg:col-span-2">
              <div className="flex items-center gap-3">
                <Users className="h-6 w-6 text-(--sm-lilac)" aria-hidden />
                <h3 className={`${DISPLAY_FONT} text-3xl font-bold leading-none text-(--sm-paper)`}>
                  {panel.title}
                </h3>
              </div>
              <p className="mt-4 leading-relaxed text-(--sm-paper)/80">{panel.body}</p>
            </article>
          )}
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
