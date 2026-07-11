"use client";
import siteMetadata from "@/data/siteMetadata";
import Link from "./Link";
import Footer from "./Footer";
import SideNav from "./SideNav";

import Image from "./Image";
import ProfileMenu from "./ProfileMenu";
import { ReactNode } from "react";
import { START_LEARNING_LINKS, COMMUNITY_LINKS } from "@/data/headerNavLinks";

const SUBSCRIBE_URL = "https://blog.codewithahsan.dev/#/portal/signup";

const LayoutWrapper = ({ children }: { children: ReactNode }) => {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="navbar bg-base-100 px-4 sm:px-8 md:px-12 lg:px-16 z-50 sticky top-0">
        <div className="navbar-start gap-2">
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
              <span className="hidden sm:inline font-bold text-base-content no-underline">
                {siteMetadata.headerTitle}
              </span>
            </div>
          </Link>
          {[
            { label: "Start learning", links: START_LEARNING_LINKS },
            { label: "Community Engagements", links: COMMUNITY_LINKS },
          ].map((group) => (
            <div key={group.label} className="dropdown dropdown-hover hidden md:inline-block">
              <div tabIndex={0} role="button" className="btn btn-ghost btn-sm">
                {group.label}
              </div>
              <ul
                tabIndex={0}
                className="menu dropdown-content bg-base-200 rounded-box z-50 w-52 p-2 shadow"
              >
                {group.links.map((l) => (
                  <li key={l.href}>
                    {l.external ? (
                      <a href={l.href} target="_blank" rel="noopener noreferrer">
                        {l.title}
                      </a>
                    ) : (
                      <Link href={l.href}>{l.title}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="navbar-end gap-1 sm:gap-2">
          <Link
            href="/about"
            className="btn btn-ghost btn-sm border-light hover:bg-light hover:text-primary-content hidden md:inline-flex"
          >
            About
          </Link>
          <Link
            href="/sponsors"
            className="btn btn-outline btn-sm text-accent border-accent hover:bg-accent hover:text-accent-content hidden md:inline-flex"
          >
            Sponsorships
          </Link>
          <a
            href={SUBSCRIBE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline btn-sm text-primary border-primary hover:bg-primary hover:text-primary-content hidden md:inline-flex"
          >
            Subscribe
          </a>
          <ProfileMenu />
          <SideNav />
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
};

export default LayoutWrapper;
