import { Instagram, Linkedin, Mail } from "lucide-react";
import {
  ORGANIZER_PROFILES,
  ORGANIZERS_INTRO,
  SECTION_IDS,
  SOCIAL_TBD,
  type Organizer,
} from "../constants";
import KineticHeading from "./KineticHeading";
import PersonAvatar from "./PersonAvatar";
import TiltCard from "./TiltCard";
import { CONTAINER, DISPLAY_FONT, FOCUS_RING, SECTION_SPACING } from "./styles";

type SocialLinkItem = {
  key: string;
  /** null renders a dimmed "coming soon" placeholder instead of a link. */
  href: string | null;
  label: string;
  icon: typeof Mail;
};

/**
 * Empty string hides a platform; SOCIAL_TBD shows it as a placeholder; any
 * other value is a real handle or address. A placeholder never gets an href,
 * so "TBD" can never turn into mailto:TBD or a /in/TBD profile URL.
 */
const linksFor = (organizer: Organizer): SocialLinkItem[] => {
  const platforms = [
    {
      key: "linkedin",
      value: organizer.linkedin,
      platform: "LinkedIn",
      href: (v: string) => `https://www.linkedin.com/in/${v}`,
      label: `${organizer.name} on LinkedIn`,
      icon: Linkedin,
    },
    {
      key: "instagram",
      value: organizer.instagram,
      platform: "Instagram",
      href: (v: string) => `https://instagram.com/${v}`,
      label: `${organizer.name} on Instagram`,
      icon: Instagram,
    },
    {
      key: "email",
      value: organizer.email,
      platform: "Email",
      href: (v: string) => `mailto:${v}`,
      label: `Email ${organizer.name}`,
      icon: Mail,
    },
  ];
  return platforms
    .filter((p) => p.value.trim() !== "")
    .map((p) =>
      p.value.trim() === SOCIAL_TBD
        ? { key: p.key, href: null, label: `${p.platform} coming soon`, icon: p.icon }
        : { key: p.key, href: p.href(p.value.trim()), label: p.label, icon: p.icon }
    );
};

const SocialLinks = ({ organizer }: { organizer: Organizer }) => {
  const links = linksFor(organizer);
  if (links.length === 0) return null;
  return (
    <div className="mt-4 flex items-center justify-center gap-2">
      {links.map(({ key, href, label, icon: Icon }) =>
        href === null ? (
          <span
            key={key}
            role="img"
            aria-label={label}
            title={label}
            className="flex h-9 w-9 cursor-default items-center justify-center rounded-full border border-(--sm-lilac)/30 text-(--sm-lilac)/30"
          >
            <Icon className="h-4 w-4" aria-hidden />
          </span>
        ) : (
          <a
            key={key}
            href={href}
            target={href.startsWith("mailto:") ? undefined : "_blank"}
            rel="noopener noreferrer"
            aria-label={label}
            title={label}
            className={`flex h-9 w-9 items-center justify-center rounded-full border border-(--sm-lilac)/25 text-(--sm-lilac) transition-colors hover:border-(--sm-amber) hover:text-(--sm-amber) ${FOCUS_RING}`}
          >
            <Icon className="h-4 w-4" aria-hidden />
          </a>
        )
      )}
    </div>
  );
};

const LeadCard = ({ organizer }: { organizer: Organizer }) => (
  <TiltCard className="h-full rounded-3xl border border-(--sm-amber)/35 bg-(--sm-dusk) p-7 text-center">
    <div className="flex justify-center">
      <PersonAvatar
        name={organizer.name}
        src={organizer.avatarUrl}
        size={128}
        className="rounded-full ring-2 ring-(--sm-amber)/60"
      />
    </div>
    <h3 className={`${DISPLAY_FONT} mt-5 text-3xl font-bold leading-tight text-(--sm-paper)`}>
      {organizer.name}
    </h3>
    {organizer.team && (
      <p className="mt-1 text-balance font-semibold text-(--sm-amber)">{organizer.team} lead</p>
    )}
    <SocialLinks organizer={organizer} />
  </TiltCard>
);

/** Team leads only: one card per entry in ORGANIZER_PROFILES, in order. */
const OrganizersSection = () => {
  if (ORGANIZER_PROFILES.length === 0) return null;

  return (
    <section
      id={SECTION_IDS.organizers}
      aria-labelledby="organisers-heading"
      className={SECTION_SPACING}
    >
      <div className={CONTAINER}>
        <div className="mb-10 max-w-3xl">
          <KineticHeading id="organisers-heading" text="Meet the team" />
          <p className="mt-5 text-lg leading-relaxed text-(--sm-paper)/85">{ORGANIZERS_INTRO}</p>
        </div>

        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {ORGANIZER_PROFILES.map((organizer) => (
            <li key={organizer.name}>
              <LeadCard organizer={organizer} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default OrganizersSection;
