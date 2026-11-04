import { Instagram, Linkedin, Mail } from "lucide-react";
import { SOCIAL_TBD, type Organizer } from "../constants";
import { FOCUS_RING } from "./styles";

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

export const SocialLinks = ({ organizer }: { organizer: Organizer }) => {
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
