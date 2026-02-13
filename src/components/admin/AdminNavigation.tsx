"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStreamerMode } from "@/hooks/useStreamerMode";

export default function AdminNavigation() {
  const pathname = usePathname();
  const { isStreamerMode, toggleStreamerMode } = useStreamerMode();

  const navItems = [
    { label: "Overview", href: "/admin", exact: true },
    { label: "Pending Mentors", href: "/admin/pending", exact: false },
    { label: "All Mentors", href: "/admin/mentors", exact: false },
    { label: "All Mentees", href: "/admin/mentees", exact: false },
    { label: "Projects", href: "/admin/projects", exact: false },
    { label: "Roadmaps", href: "/admin/roadmaps", exact: false },
  ];

  const isActive = (href: string, exact: boolean) => {
    if (exact) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="border-b border-base-300 bg-base-100">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between py-3">
          {/* Navigation links */}
          <nav className="flex gap-1">
            {navItems.map((item) => {
              const active = isActive(item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    px-4 py-2 rounded-lg transition-all
                    ${
                      active
                        ? "bg-primary text-primary-content font-semibold"
                        : "text-base-content/70 hover:bg-base-200 hover:text-base-content"
                    }
                  `}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Streamer Mode toggle */}
          <div className="flex items-center gap-2">
            <label className="label cursor-pointer gap-2">
              <span className="label-text text-sm">Streamer Mode</span>
              <input
                type="checkbox"
                className="toggle toggle-sm toggle-primary"
                checked={isStreamerMode}
                onChange={toggleStreamerMode}
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
