"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStreamerMode } from "@/hooks/useStreamerMode";
import { useAdminAccess } from "@/lib/adminAccess/client";
import type { AdminAction } from "@/lib/adminAccess/actions";

/** `action` is the ACL action needed to use the page; items the viewer can't use are hidden. */
type NavItem = { label: string; href: string; action: AdminAction; exact?: boolean };

type NavSection = {
  title?: string;
  items: NavItem[];
};

export const ADMIN_NAV: NavSection[] = [
  {
    items: [{ label: "Overview", href: "/admin", action: "portal.read", exact: true }],
  },
  {
    title: "Mentorship",
    items: [
      { label: "1:1 Advisory", href: "/admin/consulting", action: "consulting.read" },
      { label: "Pending Mentors", href: "/admin/pending", action: "mentorship.profiles.read" },
      { label: "All Mentors", href: "/admin/mentors", action: "mentorship.profiles.read" },
      { label: "All Mentees", href: "/admin/mentees", action: "mentorship.profiles.read" },
    ],
  },
  {
    title: "Content",
    items: [
      { label: "Projects", href: "/admin/projects", action: "projects.read" },
      { label: "Roadmaps", href: "/admin/roadmaps", action: "roadmaps.read" },
      { label: "Courses", href: "/admin/courses", action: "courses.read" },
      { label: "Events", href: "/admin/events", action: "events.winners.read", exact: true },
      { label: "Challenges", href: "/admin/challenges", action: "challenges.read" },
    ],
  },
  {
    title: "Ambassadors",
    items: [
      {
        label: "Applications",
        href: "/admin/ambassadors",
        action: "ambassador.applications.read",
      },
      { label: "Members", href: "/admin/ambassadors/members", action: "ambassador.members.read" },
      { label: "Cohorts", href: "/admin/ambassadors/cohorts", action: "ambassador.cohorts.read" },
      {
        label: "Eligibility Bypasses",
        href: "/admin/ambassadors/eligibility-bypasses",
        action: "ambassador.eligibilityBypass.read",
      },
    ],
  },
  {
    title: "Tools",
    items: [
      { label: "Raffle", href: "/admin/raffle", action: "raffle.entries.read" },
      { label: "Email Blasts", href: "/admin/events/email", action: "comms.emailBlast" },
      { label: "Broadcast", href: "/admin/broadcast", action: "comms.broadcast" },
    ],
  },
  {
    title: "Staff",
    items: [
      { label: "Team", href: "/admin/team", action: "staff.manage" },
      { label: "Activity", href: "/admin/activity", action: "audit.read" },
    ],
  },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  // Avoid /admin/ambassadors matching /admin/ambassadors/members etc. for the top entry
  if (href === "/admin/ambassadors") return pathname === href || pathname === "/admin/ambassadors/";
  return pathname.startsWith(href);
}

export function AdminSidebarContent() {
  const pathname = usePathname();
  const { isStreamerMode, toggleStreamerMode } = useStreamerMode();
  const { can } = useAdminAccess();

  const sections = ADMIN_NAV.map((section) => ({
    ...section,
    items: section.items.filter((item) => can(item.action)),
  })).filter((section) => section.items.length > 0);

  return (
    <aside className="flex flex-col h-full w-64 bg-base-200 border-r border-base-300">
      <div className="px-4 py-5 border-b border-base-300">
        <span className="font-bold text-lg tracking-tight">Admin Panel</span>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {sections.map((section) => (
          <div key={section.title ?? "home"}>
            {section.title && (
              <p className="px-2 mb-1 text-xs font-semibold uppercase tracking-wider text-base-content/40">
                {section.title}
              </p>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(pathname, item.href, item.exact);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                        active
                          ? "bg-primary text-primary-content font-semibold"
                          : "text-base-content/70 hover:bg-base-300 hover:text-base-content"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-base-300">
        <label className="label cursor-pointer justify-start gap-3">
          <input
            type="checkbox"
            className="toggle toggle-sm toggle-primary"
            checked={isStreamerMode}
            onChange={toggleStreamerMode}
          />
          <span className="label-text text-sm">Streamer Mode</span>
        </label>
      </div>
    </aside>
  );
}

/** Mobile hamburger button — place in the top bar of drawer-content */
export function AdminDrawerToggle() {
  return (
    <label
      htmlFor="admin-drawer"
      className="btn btn-ghost btn-sm lg:hidden"
      aria-label="Open navigation"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 6h16M4 12h16M4 18h16"
        />
      </svg>
    </label>
  );
}
