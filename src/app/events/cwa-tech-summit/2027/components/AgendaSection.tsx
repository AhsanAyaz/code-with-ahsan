import { AGENDA, AGENDA_NOTE, EVENT, SECTION_IDS } from "../constants";
import KineticHeading from "./KineticHeading";
import { CONTAINER, DISPLAY_FONT, SECTION_SPACING } from "./styles";

const AgendaSection = () => {
  return (
    <section id={SECTION_IDS.agenda} aria-labelledby="agenda-heading" className={SECTION_SPACING}>
      <div
        className={`${CONTAINER} grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-16`}
      >
        <div>
          <KineticHeading id="agenda-heading" text="How the day runs" />
          <p className="mt-5 leading-relaxed text-(--sm-paper)/80">
            {EVENT.dateLabel}, {EVENT.timeLabel}. {AGENDA_NOTE}
          </p>
        </div>

        <ol className="border-t border-(--sm-lilac)/20">
          {AGENDA.map((item) => (
            <li
              key={item.time}
              className="relative grid gap-1 border-b border-(--sm-lilac)/20 py-4 sm:grid-cols-[11rem_minmax(0,1fr)] sm:items-baseline sm:gap-6"
            >
              {/* Marker sits in the gutter left of the list so it never shifts the row. */}
              {item.isPitch && (
                <span
                  aria-hidden
                  className="absolute inset-y-3 -left-3 w-1 rounded-full bg-(--sm-amber) sm:-left-5"
                />
              )}
              <span className="text-sm tabular-nums text-(--sm-lilac)">{item.time}</span>
              <span
                className={`${DISPLAY_FONT} text-2xl leading-tight sm:text-[1.7rem] ${
                  item.isPitch
                    ? "font-extrabold text-(--sm-amber)"
                    : "font-semibold text-(--sm-paper)"
                }`}
              >
                {item.title}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
};

export default AgendaSection;
