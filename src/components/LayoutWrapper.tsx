"use client";
import siteMetadata from "@/data/siteMetadata";
import headerNavLinks, { COMMUNITY_LINKS } from "@/data/headerNavLinks";
import Link from "./Link";
import Footer from "./Footer";
import MobileNav from "./MobileNav";
import ThemeSwitch from "./ThemeSwitch";
import Image from "./Image";
import ProfileMenu from "./ProfileMenu";
import { ReactNode, useState, useRef, useEffect } from "react";

interface LinkItem {
  href: string;
  title: string;
}

// Discord logo SVG component
const DiscordIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
);

const LayoutWrapper = ({ children }: { children: ReactNode }) => {
  const [communityOpen, setCommunityOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setCommunityOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getLinkClass = (link: LinkItem) => {
    if (link.href.includes("ng-book")) {
      return "btn btn-sm btn-primary";
    } else if (link.href.includes("hackstack")) {
      return "btn btn-sm btn-error btn-outline";
    }
    return "btn btn-ghost";
  };

  // Filter out Discord from primary links (already in Community dropdown)
  const allLinks = headerNavLinks;
  const primaryLinks = allLinks.filter(
    (link) =>
      !(
        link.href === "/rates" ||
        link.title === "Rates" ||
        link.title === "Discord" ||
        link.href.includes("discord.gg")
      )
  );

  return (
    <div className="flex flex-col min-h-screen">
      <header className="navbar bg-base-100 px-4 sm:px-8 md:px-12 lg:px-16 z-50">
        <div className="navbar-start">
          <Link
            href="/"
            aria-label="Code with Ahsan"
            className="btn btn-link normal-case text-xl h-auto min-h-0 py-2"
          >
            <div className="flex items-center justify-between">
              <Image
                src={siteMetadata.siteLogo}
                alt="site logo"
                width={50}
                height={50}
                style={{ objectFit: "cover" }}
              />
            </div>
          </Link>
        </div>
        <div className="navbar-center hidden md:flex">
          <div className="flex items-center gap-1">
            {primaryLinks.map((link) => (
              <Link
                key={link.title}
                href={link.href}
                className={getLinkClass(link)}
              >
                {link.title}
              </Link>
            ))}
            {/* Community Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                className="btn btn-ghost"
                onClick={() => setCommunityOpen(!communityOpen)}
              >
                Community
                <svg
                  className="w-4 h-4 ml-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {communityOpen && (
                <ul className="absolute top-full left-0 z-[100] menu p-2 shadow-lg bg-base-100 rounded-box w-52">
                  {COMMUNITY_LINKS.map((item) => (
                    <li key={item.title}>
                      <Link
                        href={item.href}
                        className="flex items-center gap-2"
                        onClick={() => setCommunityOpen(false)}
                        {...(item.external
                          ? { target: "_blank", rel: "noopener noreferrer" }
                          : {})}
                      >
                        {item.icon === "discord" && <DiscordIcon />}
                        {item.icon === "mentorship" && <span>🤝</span>}
                        {item.icon === "projects" && <span>🚀</span>}
                        {item.icon === "brain" && <span>🧠</span>}
                        {item.title}
                        {item.external && (
                          <svg
                            className="w-3 h-3 opacity-50"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
        <div className="navbar-end gap-2">
          <ThemeSwitch />
          <MobileNav linkClassOverrides={getLinkClass} />
          <ProfileMenu />
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
};

export default LayoutWrapper;
