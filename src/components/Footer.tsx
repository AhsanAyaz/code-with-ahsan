import Link from "./Link";
import siteMetadata from "@/data/siteMetadata";
import SocialIcon from "@/components/social-icons";

export default function Footer() {
  return (
    <footer className="footer footer-center flex flex-col md:flex-row md:justify-center md:gap-8 p-10 bg-base-200 text-base-content rounded mt-16">
      <nav>
        <div className="grid grid-flow-col gap-4">
          <SocialIcon kind="twitch" href={siteMetadata.twitch} size="24" />
          <SocialIcon
            kind="mail"
            href={`mailto:${siteMetadata.email}`}
            size="24"
          />
          <SocialIcon kind="github" href={siteMetadata.github} size="24" />
          <SocialIcon kind="facebook" href={siteMetadata.facebook} size="24" />
          <SocialIcon kind="youtube" href={siteMetadata.youtube} size="24" />
          <SocialIcon kind="linkedin" href={siteMetadata.linkedin} size="24" />
          <SocialIcon kind="twitter" href={siteMetadata.twitter} size="24" />
        </div>
      </nav>
      <nav className="grid grid-flow-col gap-4">
        <Link href="/privacy" className="link link-hover text-sm">
          Privacy Policy
        </Link>
        <Link href="/terms" className="link link-hover text-sm">
          Terms of Service
        </Link>
      </nav>
      <aside>
        <div className="flex flex-col sm:flex-row items-center gap-2 text-sm text-base-content/70">
          <div>{siteMetadata.author}</div>
          <div className="hidden sm:block">•</div>
          <div>{`© ${new Date().getFullYear()}`}</div>
          <div className="hidden sm:block">•</div>
          <Link href="/" className="link link-hover">
            {siteMetadata.title}
          </Link>
        </div>
      </aside>
    </footer>
  );
}
