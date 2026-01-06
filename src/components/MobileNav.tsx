import { useState } from "react";
import Link from "./Link";
import headerNavLinks from "@/data/headerNavLinks";

interface LinkItem {
  href: string;
  title: string;
}

interface MobileNavProps {
  linkClassOverrides: (link: LinkItem) => string;
}

const MobileNav = ({ linkClassOverrides }: MobileNavProps) => {
  const [navShow, setNavShow] = useState(false);

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

  // Filter out Discord from primary links (we add it directly)
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
      <div
        className={`fixed inset-0 bg-base-100/95 z-[100] transform ease-in-out duration-300 ${
          navShow ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex justify-end p-4">
          <button
            type="button"
            className="btn btn-ghost btn-circle"
            aria-label="toggle modal"
            onClick={onToggleNav}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="text-base-content w-8 h-8"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <nav className="h-full mt-8 overflow-y-auto">
          {primaryLinks.map((link) => (
            <div key={link.title} className="px-12 py-4">
              <Link
                href={link.href}
                className={`text-2xl font-bold tracking-widest text-base-content hover:text-primary ${linkClassOverrides(
                  link
                )}`}
                onClick={onToggleNav}
              >
                {link.title}
              </Link>
            </div>
          ))}
          {/* Direct Discord link instead of More dropdown */}
          <div className="px-12 py-4">
            <Link
              href="https://discord.gg/KSPpuxD8SG"
              className="text-2xl font-bold tracking-widest text-base-content hover:text-primary btn btn-ghost"
              onClick={onToggleNav}
            >
              Discord
            </Link>
          </div>
        </nav>
      </div>
    </div>
  );
};

export default MobileNav;
