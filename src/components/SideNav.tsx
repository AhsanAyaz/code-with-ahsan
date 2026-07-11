"use client";

import { useEffect, useRef, useState } from "react";
import Link from "./Link";
import headerNavLinks, { MORE_LINKS } from "@/data/headerNavLinks";
import { usePathname } from "next/navigation";

const ExternalIcon = ({ className }: { className: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
    />
  </svg>
);

const SideNav = () => {
  const [navShow, setNavShow] = useState(false);
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  const isActive = (href: string) => {
    if (href.startsWith("http")) return false; // external links never active
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  };

  const closeNav = () => setNavShow(false);

  // Close on route change (client-side navigations) — render-phase state
  // adjustment per React docs, avoids a cascading effect render.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    if (navShow) setNavShow(false);
  }

  // Body scroll lock + focus management + Esc + focus trap
  useEffect(() => {
    if (!navShow) {
      document.body.style.overflow = "auto";
      return;
    }
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setNavShow(false);
        hamburgerRef.current?.focus();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        "a[href], button:not([disabled])"
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "auto";
    };
  }, [navShow]);

  return (
    <div className="z-[100] md:hidden">
      <button
        ref={hamburgerRef}
        type="button"
        className="btn btn-ghost btn-circle"
        aria-label="Toggle Menu"
        aria-expanded={navShow}
        aria-controls="site-nav-drawer"
        onClick={() => setNavShow(true)}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="text-base-content w-6 h-6"
        >
          <path
            fillRule="evenodd"
            d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[100] bg-black/50 transition-opacity duration-300 ${
          navShow ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden="true"
        onClick={closeNav}
      />

      {/* Drawer */}
      <div
        ref={panelRef}
        id="site-nav-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Site navigation"
        className={`fixed top-0 right-0 bottom-0 z-[101] w-3/4 max-w-xs bg-base-100 shadow-xl transform transition-transform duration-300 ease-in-out ${
          navShow ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Close button */}
        <div className="flex justify-end p-4">
          <button
            ref={closeButtonRef}
            type="button"
            className="btn btn-ghost btn-sm btn-circle"
            aria-label="Close menu"
            onClick={() => {
              closeNav();
              hamburgerRef.current?.focus();
            }}
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
          {/* Primary flat links */}
          {headerNavLinks.map((link) => (
            <div key={link.title} className="py-2.5">
              <Link
                href={link.href}
                className={`text-lg font-semibold hover:text-primary ${
                  isActive(link.href) ? "text-primary font-bold" : "text-base-content"
                }`}
                onClick={closeNav}
                {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              >
                {link.title}
                {link.external && (
                  <ExternalIcon className="inline-block w-3.5 h-3.5 ml-1 opacity-50" />
                )}
              </Link>
            </div>
          ))}

          {/* More section divider */}
          <div className="mt-4 mb-2 text-xs font-semibold uppercase tracking-wider text-base-content/50">
            More
          </div>

          {/* More links */}
          <div className="space-y-1">
            {MORE_LINKS.map((item) => (
              <div key={item.title}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-2.5 px-1 py-2 text-base hover:text-primary rounded-lg ${
                    isActive(item.href) ? "text-primary font-bold" : "text-base-content/80"
                  }`}
                  onClick={closeNav}
                  {...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                >
                  {item.title}
                  {item.external && <ExternalIcon className="w-3.5 h-3.5 opacity-50" />}
                </Link>
              </div>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
};

export default SideNav;
