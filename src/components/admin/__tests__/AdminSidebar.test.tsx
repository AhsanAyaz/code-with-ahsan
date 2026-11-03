import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ADMIN_ACTIONS, can, type AdminRole } from "@/lib/adminAccess/actions";

const state = vi.hoisted(() => ({ role: "admin" as AdminRole | null }));

vi.mock("@/lib/adminAccess/client", () => ({
  useAdminAccess: () => ({
    status: "ready",
    role: state.role,
    email: "staff@example.com",
    can: (action: Parameters<typeof can>[1]) => can(state.role, action),
    refresh: async () => {},
  }),
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/admin" }));
vi.mock("@/hooks/useStreamerMode", () => ({
  useStreamerMode: () => ({ isStreamerMode: false, toggleStreamerMode: () => {} }),
}));

import { AdminSidebarContent, ADMIN_NAV } from "../AdminSidebar";

function render(role: AdminRole) {
  state.role = role;
  return renderToStaticMarkup(<AdminSidebarContent />);
}

const ADMIN_ONLY_HREFS = [
  "/admin/events/email",
  "/admin/broadcast",
  "/admin/team",
  "/admin/activity",
];

describe("AdminSidebar", () => {
  it("every nav item names a real ACL action", () => {
    for (const item of ADMIN_NAV.flatMap((s) => s.items)) {
      expect(Object.prototype.hasOwnProperty.call(ADMIN_ACTIONS, item.action)).toBe(true);
    }
  });

  it("shows every item, including Team and Activity, to an admin", () => {
    const html = render("admin");
    for (const item of ADMIN_NAV.flatMap((s) => s.items)) {
      expect(html).toContain(`href="${item.href}"`);
    }
    expect(html).toContain(">Team<");
    expect(html).toContain(">Activity<");
  });

  it("hides Email blast, Broadcast, Team and Activity from a moderator", () => {
    const html = render("moderator");
    for (const href of ADMIN_ONLY_HREFS) {
      expect(html).not.toContain(`href="${href}"`);
    }
    // The Staff section has nothing left for a moderator, so its heading goes too.
    expect(html).not.toContain(">Staff<");
    // Moderator pages stay.
    expect(html).toContain('href="/admin/projects"');
    expect(html).toContain('href="/admin/raffle"');
  });
});
