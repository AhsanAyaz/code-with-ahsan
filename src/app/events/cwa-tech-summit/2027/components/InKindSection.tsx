import { Gift, Mail, UtensilsCrossed, Wrench } from "lucide-react";
import {
  EVENT,
  IN_KIND,
  IN_KIND_INTRO,
  SECTION_IDS,
  SPONSOR_CONTACT,
  SPONSOR_NEXT_STEPS,
  sponsorMailto,
} from "../constants";
import KineticHeading from "./KineticHeading";
import { BUTTON_PRIMARY, CONTAINER, DISPLAY_FONT, SECTION_SPACING } from "./styles";

const ICONS = [UtensilsCrossed, Gift, Wrench];

const InKindSection = () => {
  return (
    <section id={SECTION_IDS.inKind} aria-labelledby="inkind-heading" className={SECTION_SPACING}>
      <div className={`${CONTAINER} grid gap-16 lg:grid-cols-2 lg:gap-20`}>
        <div>
          <KineticHeading id="inkind-heading" text="Sponsor in kind" />
          <p className="mt-5 text-lg leading-relaxed text-(--sm-paper)/85">{IN_KIND_INTRO}</p>
          <ul className="mt-8 space-y-6">
            {IN_KIND.map((option, i) => {
              const Icon = ICONS[i % ICONS.length];
              return (
                <li key={option.title} className="flex gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-(--sm-violet)/25 text-(--sm-lilac)">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold text-(--sm-paper)">{option.title}</h3>
                    <p className="mt-1 leading-relaxed text-(--sm-paper)/80">{option.body}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="rounded-3xl border border-(--sm-lilac)/20 bg-(--sm-dusk)/80 p-7 sm:p-10">
          <h3 className={`${DISPLAY_FONT} text-4xl font-extrabold leading-none text-(--sm-paper)`}>
            Next steps
          </h3>
          <ol className="mt-8 space-y-6">
            {SPONSOR_NEXT_STEPS.map((step, i) => (
              <li key={step} className="flex items-baseline gap-5">
                <span
                  className={`${DISPLAY_FONT} w-8 shrink-0 text-4xl font-black leading-none text-(--sm-amber)`}
                  aria-hidden
                >
                  {i + 1}
                </span>
                <span className="text-lg leading-snug text-(--sm-paper)">{step}</span>
              </li>
            ))}
          </ol>
          <a
            href={sponsorMailto(`Sponsoring ${EVENT.name}`)}
            className={`${BUTTON_PRIMARY} mt-10 w-full sm:w-auto`}
          >
            <Mail className="h-5 w-5" aria-hidden />
            Email us about sponsoring
          </a>
          <p className="mt-4 break-all text-sm text-(--sm-lilac)">{SPONSOR_CONTACT.email}</p>
        </div>
      </div>
    </section>
  );
};

export default InKindSection;
