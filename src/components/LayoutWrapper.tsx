"use client";
import siteMetadata from "@/data/siteMetadata";
import headerNavLinks from "@/data/headerNavLinks";
import Link from "./Link";
import Footer from "./Footer";
import MobileNav from "./MobileNav";
import ThemeSwitch from "./ThemeSwitch";
import Image from "./Image";
import ProfileMenu from "./ProfileMenu";
import { ReactNode } from "react";

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
    return "btn btn-ghost";
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
            {/* Direct Discord link instead of More dropdown */}
            <Link
              href="https://discord.gg/KSPpuxD8SG"
              className="btn btn-ghost"
            >
              Discord
            </Link>
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
