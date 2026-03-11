"use client";
import siteMetadata from "@/data/siteMetadata";
import headerNavLinks, { MORE_LINKS } from "@/data/headerNavLinks";
import Link from "./Link";
import Footer from "./Footer";
import MobileNav from "./MobileNav";
import ThemeSwitch from "./ThemeSwitch";
import Image from "./Image";
import ProfileMenu from "./ProfileMenu";
import { ReactNode, useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";

const LayoutWrapper = ({ children }: { children: ReactNode }) => {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isActive = (href: string) => {
    if (href.startsWith("http")) return false; // external links never active
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="navbar bg-base-100 px-4 sm:px-8 md:px-12 lg:px-16 z-50">
        <div className="navbar-start shrink-0 w-auto">
          <Link
            href="/"
            aria-label="Code with Ahsan"
            className="btn btn-link normal-case text-xl h-auto min-h-0 py-2 no-underline hover:no-underline"
          >
            <div className="flex items-center gap-2">
              <Image
                src={siteMetadata.siteLogo}
                alt="site logo"
                width={50}
                height={50}
                style={{ objectFit: "cover" }}
              />
              <span className="hidden lg:inline font-bold text-base-content no-underline">{siteMetadata.headerTitle}</span>
            </div>
          </Link>
        </div>
        <div className="navbar-center hidden md:flex flex-1 justify-center">
          <div className="flex items-center gap-1">
            {headerNavLinks.map((link) => (
              <Link
                key={link.title}
                href={link.href}
                className={`btn btn-ghost${isActive(link.href) ? " btn-active" : ""}`}
                {...(link.external
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
              >
                {link.title}
              </Link>
            ))}
            {/* More Dropdown */}
            <div className="relative" ref={moreRef}>
              <button
                className="btn btn-ghost"
                onClick={() => setMoreOpen(!moreOpen)}
              >
                More
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
              {moreOpen && (
                <ul className="absolute top-full left-0 z-[100] menu p-2 shadow-lg bg-base-300 rounded-box w-48">
                  {MORE_LINKS.map((item) => (
                    <li key={item.title}>
                      <Link
                        href={item.href}
                        className="flex items-center gap-2"
                        onClick={() => setMoreOpen(false)}
                        {...(item.external
                          ? { target: "_blank", rel: "noopener noreferrer" }
                          : {})}
                      >
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
        <div className="navbar-end shrink-0 w-auto gap-2">
          <ThemeSwitch />
          <MobileNav />
          <ProfileMenu />
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
};

export default LayoutWrapper;
