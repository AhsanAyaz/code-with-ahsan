"use client";
import siteMetadata from "@/data/siteMetadata";
import headerNavLinks from "@/data/headerNavLinks";
import Link from "./Link";
import SectionContainer from "./SectionContainer";
import Footer from "./Footer";
import MobileNav from "./MobileNav";
import ThemeSwitch from "./ThemeSwitch";
import Image from "./Image";
import ProfileMenu from "./ProfileMenu";
import { useEffect, useRef, useState, ReactNode } from "react";

interface LinkItem {
  href: string;
  title: string;
}

const LayoutWrapper = ({ children }: { children: ReactNode }) => {
  const linkClassOverrides = (link: LinkItem) => {
    let classes = "p-1 font-bold text-base-content sm:p-4";
    if (link.href.includes("ng-book")) {
      return `relative w-full sm:w-auto block text-sm font-bold outline-primary-600 ring-2 rounded-md text-primary py-4 px-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 hover:bg-primary-600 hover:text-white hover:outline-none hover:ring-0`;
    } else if (link.href.includes("hackstack")) {
      return `${classes} text-red-500 hover:text-red-600 dark:text-red-800 dark:hover:text-red-900 hover:underline underline-offset-8	duration-200`;
    }
    return classes;
  };
  // Compute primary vs more links
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
  const moreLinks = allLinks.filter(
    (link) =>
      link.href === "/rates" ||
      link.title === "Rates" ||
      link.title === "Discord" ||
      link.href.includes("discord.gg")
  );

  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMoreOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (!moreRef.current || !moreBtnRef.current) return;
      if (
        !moreRef.current.contains(e.target as Node) &&
        !moreBtnRef.current.contains(e.target as Node)
      ) {
        setIsMoreOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <SectionContainer>
      <div className="flex flex-col h-screen">
        <header className="flex items-center justify-between py-0 sm:py-4">
          <nav>
            <Link href="/" aria-label="Code with Ahsan">
              <div className="flex items-center justify-between">
                <Image
                  src={siteMetadata.siteLogo}
                  alt="site logo"
                  width={100}
                  height={100}
                  style={{ objectFit: "cover" }}
                />
              </div>
            </Link>
          </nav>
          <div className="flex items-center text-base leading-5">
            <nav className="hidden sm:flex items-center relative">
              {primaryLinks.map((link) => (
                <Link
                  key={link.title}
                  href={link.href}
                  className={`text-center ${linkClassOverrides(link)}`}
                >
                  {link.title}
                </Link>
              ))}
              {moreLinks.length > 0 && (
                <div className="ml-2 relative" ref={moreRef}>
                  <button
                    ref={moreBtnRef}
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={isMoreOpen}
                    onClick={() => setIsMoreOpen((v) => !v)}
                    className="p-1 font-bold text-base-content sm:p-4 inline-flex items-center gap-1 hover:underline underline-offset-8"
                  >
                    More
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`h-4 w-4 transition-transform ${
                        isMoreOpen ? "rotate-180" : ""
                      }`}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                  <div
                    role="menu"
                    className={`absolute right-0 mt-2 min-w-[10rem] rounded-md border border-gray-200 dark:border-gray-700 bg-base-100 shadow-lg py-1 z-50 ${
                      isMoreOpen ? "block" : "hidden"
                    }`}
                  >
                    {moreLinks.map((link) => (
                      <Link
                        key={link.title}
                        href={link.href}
                        className="block w-full text-left px-4 py-2 text-sm text-base-content hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={() => setIsMoreOpen(false)}
                      >
                        {link.title}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </nav>
            <ThemeSwitch />
            <MobileNav linkClassOverrides={linkClassOverrides} />
          </div>
          <ProfileMenu />
        </header>
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </SectionContainer>
  );
};

export default LayoutWrapper;
