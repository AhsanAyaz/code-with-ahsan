"use client";
import siteMetadata from "@/data/siteMetadata";
import Link from "./Link";
import Footer from "./Footer";
import SideNav from "./SideNav";

import Image from "./Image";
import ProfileMenu from "./ProfileMenu";
import { ReactNode } from "react";
import { HandCoins } from "lucide-react";

const LayoutWrapper = ({ children }: { children: ReactNode }) => {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="navbar bg-base-100 px-4 sm:px-8 md:px-12 lg:px-16 z-50 sticky top-0">
        <div className="navbar-start">
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
        </div>
        <div className="navbar-end gap-2">
          <Link
            href="/sponsors"
            aria-label="Sponsor"
            className="btn btn-sm btn-accent gap-1 min-h-11"
          >
            <HandCoins className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">Sponsor</span>
          </Link>
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
