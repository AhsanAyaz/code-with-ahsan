import { useState, useEffect } from "react";
import Link from "./Link";
import headerNavLinks, { COMMUNITY_LINKS } from "@/data/headerNavLinks";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { getApp } from "firebase/app";

interface LinkItem {
  href: string;
  title: string;
}

interface MobileNavProps {
  linkClassOverrides: (link: LinkItem) => string;
}

// Discord logo SVG component
const DiscordIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
  </svg>
);

const MobileNav = ({ linkClassOverrides }: MobileNavProps) => {
  const [navShow, setNavShow] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Listen to Firebase auth state for smart routing
  useEffect(() => {
    const app = getApp();
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const onToggleNav = () => {
    setNavShow((status) => {
      if (status) {
        document.body.style.overflow = "auto";
      } else {
        // Prevent scrolling
        document.body.style.overflow = "hidden";
      }
      return !status;
    });
  };

  // Filter out Discord and community items from primary links
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
    <div className="md:hidden z-[100]">
      <button
        type="button"
        className="btn btn-ghost btn-circle"
        aria-label="Toggle Menu"
        onClick={onToggleNav}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="text-base-content w-6 h-6"
        >
          {navShow ? (
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          ) : (
            <path
              fillRule="evenodd"
              d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
              clipRule="evenodd"
            />
          )}
        </svg>
      </button>

      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[100] bg-black/50 transition-opacity duration-300 ${
          navShow ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden="true"
        onClick={onToggleNav}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 bottom-0 z-[101] w-3/4 max-w-xs bg-base-100 shadow-xl transform transition-transform duration-300 ease-in-out ${
          navShow ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Close button */}
        <div className="flex justify-end p-4">
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-circle"
            aria-label="Close menu"
            onClick={onToggleNav}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="text-base-content w-6 h-6"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {/* Scrollable nav content */}
        <nav className="h-[calc(100%-4rem)] overflow-y-auto px-5 pb-8">
          {/* Primary links */}
          {primaryLinks.map((link) => (
            <div key={link.title} className="py-2.5">
              <Link
                href={link.href}
                className={`text-lg font-semibold text-base-content hover:text-primary ${linkClassOverrides(
                  link
                )}`}
                onClick={onToggleNav}
              >
                {link.title}
              </Link>
            </div>
          ))}

          {/* Community section divider */}
          <div className="mt-4 mb-2 text-xs font-semibold uppercase tracking-wider text-base-content/50">
            Community
          </div>

          {/* Community links — flat list */}
          <div className="space-y-1">
            {COMMUNITY_LINKS.map((item) => {
              // Smart routing for Mentorship: dashboard if logged in, mentorship page if not
              const href = item.title === "Mentorship" && user && !authLoading
                ? "/mentorship/dashboard"
                : item.href;

              return (
                <div key={item.title}>
                  <Link
                    href={href}
                    className="flex items-center gap-2.5 px-1 py-2 text-base text-base-content/80 hover:text-primary rounded-lg"
                    onClick={onToggleNav}
                    {...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  >
                    {item.icon === "discord" && <DiscordIcon />}
                    {item.icon === "mentorship" && <span className="text-base">🤝</span>}
                    {item.icon === "projects" && <span className="text-base">🚀</span>}
                    {item.icon === "roadmap" && <span className="text-base">🗺️</span>}
                    {item.icon === "my-projects" && <span className="text-base">📂</span>}
                    {item.icon === "brain" && <span className="text-base">🧠</span>}
                    {item.icon === "community" && <span className="text-base">🏘️</span>}
                    {item.icon === "events" && <span className="text-base">🎉</span>}
                    {item.title}
                    {item.external && (
                      <svg className="w-3.5 h-3.5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    )}
                  </Link>
                </div>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
};

export default MobileNav;
