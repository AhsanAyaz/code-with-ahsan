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
  const getLinkClass = (link: LinkItem) => {
    if (link.href.includes("ng-book")) {
      return "btn btn-sm btn-primary";
    } else if (link.href.includes("hackstack")) {
      return "btn btn-sm btn-error btn-outline";
    }
    return "btn btn-sm btn-ghost";
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
  const moreBtnRef = useRef<HTMLDivElement>(null);

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
        <header className="navbar bg-base-100 px-0 sm:px-4 z-50">
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
              {moreLinks.length > 0 && (
                <div
                  className={`dropdown dropdown-end ${isMoreOpen ? "dropdown-open" : ""}`}
                  ref={moreRef}
                >
                  <div
                    tabIndex={0}
                    role="button"
                    ref={moreBtnRef}
                    className="btn btn-ghost btn-sm gap-1"
                    onClick={() => setIsMoreOpen(!isMoreOpen)}
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
                  </div>
                  <ul
                    tabIndex={0}
                    className="dropdown-content z-50 menu p-2 shadow bg-base-100 rounded-box w-52"
                  >
                    {moreLinks.map((link) => (
                      <li key={link.title}>
                        <Link
                          href={link.href}
                          className="whitespace-nowrap px-4 py-2 block w-full text-left hover:bg-base-200"
                          onClick={() => setIsMoreOpen(false)}
                        >
                          {link.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
          <div className="navbar-end gap-2">
            <ThemeSwitch />
            <MobileNav linkClassOverrides={getLinkClass} />
            <ProfileMenu />
          </div>
        </header>
        <main className="flex-1 pt-4">{children}</main>
        <Footer />
      </div>
    </SectionContainer>
  );
};

export default LayoutWrapper;
