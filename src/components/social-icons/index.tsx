import Mail from "./mail.svg";
import Github from "./github.svg";
import Facebook from "./facebook.svg";
import Youtube from "./youtube.svg";
import Linkedin from "./linkedin.svg";
import Twitter from "./twitter.svg";
import Twitch from "./twitch.svg";

// Icons taken from: https://simpleicons.org/

const components = {
  mail: Mail,
  github: Github,
  facebook: Facebook,
  youtube: Youtube,
  linkedin: Linkedin,
  twitter: Twitter,
  twitch: Twitch,
};

type SocialIconKind = keyof typeof components;

interface SocialIconProps {
  kind: SocialIconKind;
  href: string | undefined;
  size?: string | number;
  color?: string;
}

const SocialIcon = ({
  kind,
  href,
  size = 24,
  color = "text-base-content",
}: SocialIconProps) => {
  if (
    !href ||
    (kind === "mail" &&
      !/^mailto:\w+([.-]?\w+)@\w+([.-]?\w+)(.\w{2,3})+$/.test(href))
  )
    return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SocialSvg = components[kind] as any;

  return (
    <a
      className="text-sm text-base-content/70 transition hover:text-base-content"
      target="_blank"
      rel="noopener noreferrer"
      href={href}
    >
      <span className="sr-only">{kind}</span>
      <SocialSvg
        style={{ width: size, height: size }}
        className={`fill-current ${color} hover:text-primary dark:hover:text-primary `}
      />
    </a>
  );
};

export default SocialIcon;
