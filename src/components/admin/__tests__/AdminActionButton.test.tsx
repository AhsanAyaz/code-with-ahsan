import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { can, type AdminRole } from "@/lib/adminAccess/actions";

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

import AdminActionButton, { ADMINS_ONLY_TOOLTIP } from "../AdminActionButton";

function render(role: AdminRole) {
  state.role = role;
  return renderToStaticMarkup(
    <AdminActionButton action="projects.delete" className="btn btn-error" onClick={() => {}}>
      Delete Project
    </AdminActionButton>
  );
}

beforeEach(() => {
  state.role = "admin";
});

describe("AdminActionButton", () => {
  it("renders a normal, enabled button for an admin", () => {
    const html = render("admin");
    expect(html).toContain("Delete Project");
    expect(html).toContain('class="btn btn-error"');
    expect(html).not.toContain("aria-disabled");
    expect(html).not.toContain("disabled");
    expect(html).not.toContain(ADMINS_ONLY_TOOLTIP);
    expect(html).not.toContain("admin-action-lock");
  });

  it("renders a locked button with an 'Admins only' tooltip for a moderator", () => {
    const html = render("moderator");
    expect(html).toContain("Delete Project");
    // Disabled for assistive tech but still focusable so the tooltip is reachable.
    expect(html).toContain('aria-disabled="true"');
    expect(html).not.toMatch(/\sdisabled=""/);
    expect(html).toContain("btn-disabled");
    // Visible tooltip on hover/focus, plus the reason linked by aria-describedby.
    expect(html).toContain(`data-tip="${ADMINS_ONLY_TOOLTIP}"`);
    const describedBy = html.match(/aria-describedby="([^"]+)"/)?.[1];
    expect(describedBy).toBeTruthy();
    expect(html).toContain(`id="${describedBy}" class="sr-only">${ADMINS_ONLY_TOOLTIP}<`);
    // Lock icon, not just colour.
    expect(html).toContain("admin-action-lock");
  });

  it("stays enabled for a moderator on a moderator action", () => {
    state.role = "moderator";
    const html = renderToStaticMarkup(
      <AdminActionButton action="projects.approve" className="btn">
        Approve
      </AdminActionButton>
    );
    expect(html).not.toContain("aria-disabled");
    expect(html).not.toContain(ADMINS_ONLY_TOOLTIP);
  });
});
