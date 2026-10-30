import { Linkedin, Mail } from "lucide-react";
import { CONTACTS, SECTION_IDS } from "../constants";
import KineticHeading from "./KineticHeading";
import PersonAvatar from "./PersonAvatar";
import { CONTAINER, DISPLAY_FONT, FOCUS_RING, SECTION_SPACING } from "./styles";

const ContactSection = () => {
  return (
    <section id={SECTION_IDS.contact} aria-labelledby="contact-heading" className={SECTION_SPACING}>
      <div className={CONTAINER}>
        <div className="mb-10 max-w-3xl">
          <KineticHeading id="contact-heading" text="Got questions?" />
          <p className="mt-5 text-lg leading-relaxed text-(--sm-paper)/85">
            Questions about sponsoring, speaking or the pitch competition? Email either of us and we
            will get back to you.
          </p>
        </div>

        <ul className="grid gap-5 md:grid-cols-2">
          {CONTACTS.map((contact, i) => (
            <li
              key={contact.email}
              className={`flex flex-col gap-6 rounded-3xl border p-6 sm:flex-row sm:items-center sm:p-8 ${
                i === 0
                  ? "border-(--sm-amber)/35 bg-(--sm-dusk)"
                  : "border-(--sm-lilac)/20 bg-(--sm-dusk)/60"
              }`}
            >
              <PersonAvatar
                name={contact.name}
                src={contact.avatarUrl}
                size={112}
                className="rounded-2xl"
              />
              <div className="min-w-0">
                <p className="text-sm text-(--sm-lilac)">{contact.role}</p>
                <h3
                  className={`${DISPLAY_FONT} mt-1 text-3xl font-bold leading-tight text-(--sm-paper)`}
                >
                  {contact.name}
                </h3>
                {contact.title && (
                  <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-(--sm-paper)/75">
                    {contact.title}
                  </p>
                )}
                <div className="mt-4 flex flex-col gap-2">
                  <a
                    href={`mailto:${contact.email}`}
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
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default ContactSection;
