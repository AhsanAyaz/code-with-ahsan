import { Linkedin, Mail } from "lucide-react";
import { CONTACTS, ORGANIZER_PROFILES, SECTION_IDS, type ContactPerson } from "../constants";
import KineticHeading from "./KineticHeading";
import { SocialLinks } from "./SocialLinks";
import PersonAvatar from "./PersonAvatar";
import { CONTAINER, DISPLAY_FONT, FOCUS_RING, SECTION_SPACING } from "./styles";

/**
 * Large contact card. `highlight` gives it the amber border; `emailHref`
 * overrides the plain mailto (e.g. to prefill a subject).
 */
export const ContactCard = ({
  contact,
  highlight = false,
  emailHref,
}: {
  contact: ContactPerson;
  highlight?: boolean;
  emailHref?: string;
}) => (
  <div
    className={`flex h-full flex-col gap-6 rounded-3xl border p-6 sm:flex-row sm:items-center sm:p-8 ${
      highlight
        ? "border-(--sm-amber)/35 bg-(--sm-dusk)"
        : "border-(--sm-lilac)/20 bg-(--sm-dusk)/60"
    }`}
  >
    <PersonAvatar name={contact.name} src={contact.avatarUrl} size={112} className="rounded-2xl" />
    <div className="min-w-0">
      <p className="text-sm text-(--sm-lilac)">{contact.role}</p>
      <h3 className={`${DISPLAY_FONT} mt-1 text-3xl font-bold leading-tight text-(--sm-paper)`}>
        {contact.name}
      </h3>
      {contact.title && (
        <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-(--sm-paper)/75">
          {contact.title}
        </p>
      )}
      <div className="mt-4 flex flex-col gap-2">
        <a
          href={emailHref ?? `mailto:${contact.email}`}
          className={`inline-flex max-w-full items-center gap-2 text-sm font-medium text-(--sm-paper) hover:text-(--sm-amber) ${FOCUS_RING}`}
        >
          <Mail className="h-4 w-4 shrink-0 text-(--sm-amber)" aria-hidden />
          <span className="break-all">{contact.email}</span>
        </a>
        {contact.linkedinUrl && (
          <a
            href={contact.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex w-fit items-center gap-2 text-sm font-medium text-(--sm-paper) hover:text-(--sm-amber) ${FOCUS_RING}`}
          >
            <Linkedin className="h-4 w-4 shrink-0 text-(--sm-amber)" aria-hidden />
            LinkedIn
          </a>
        )}
      </div>
    </div>
  </div>
);

const contactNames = new Set(CONTACTS.map((c) => c.name));
/** Team leads not already shown as a full contact card. */
const TEAM_LEADS = ORGANIZER_PROFILES.filter((o) => !contactNames.has(o.name));

const ContactSection = () => {
  return (
    <section id={SECTION_IDS.contact} aria-labelledby="contact-heading" className={SECTION_SPACING}>
      <div className={CONTAINER}>
        <div className="mb-10 max-w-3xl">
          <KineticHeading id="contact-heading" text="Got questions?" />
          <p className="mt-5 text-lg leading-relaxed text-(--sm-paper)/85">
            Questions about sponsoring, speaking or the pitch competition? Reach out to any of us
            and we will get back to you.
          </p>
        </div>

        <ul className="grid gap-5 md:grid-cols-2">
          {CONTACTS.map((contact, i) => (
            <li key={contact.email}>
              <ContactCard contact={contact} highlight={i === 0} />
            </li>
          ))}
        </ul>

        {TEAM_LEADS.length > 0 && (
          <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {TEAM_LEADS.map((lead) => (
              <li
                key={lead.name}
                className="flex h-full flex-col items-center rounded-3xl border border-(--sm-lilac)/20 bg-(--sm-dusk)/60 p-7 text-center"
              >
                <PersonAvatar
                  name={lead.name}
                  src={lead.avatarUrl}
                  size={128}
                  className="rounded-full ring-2 ring-(--sm-amber)/60"
                />
                <h3
                  className={`${DISPLAY_FONT} mt-5 text-3xl font-bold leading-tight text-(--sm-paper)`}
                >
                  {lead.name}
                </h3>
                {lead.team && (
                  <p className="mt-1 text-balance font-semibold text-(--sm-amber)">
                    {lead.team} lead
                  </p>
                )}
                <SocialLinks organizer={lead} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};

export default ContactSection;
