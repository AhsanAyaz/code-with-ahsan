/**
 * Phase 5 (DISC-05): unit coverage for removeDiscordRole.
 * Test boundary: mock global.fetch (fetchWithRateLimit ultimately calls it).
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { removeDiscordRole } from "./discord";

describe("removeDiscordRole (DISC-05)", () => {
  beforeEach(() => {
    process.env.DISCORD_BOT_TOKEN = "test-token";
    process.env.DISCORD_GUILD_ID = "1234567890";
    vi.restoreAllMocks();
  });

  it("returns true on Discord 204", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(null, { status: 204 }),
    );
    const result = await removeDiscordRole("123456789012345678", "999");
    expect(result).toBe(true);
  });

  it("returns true on Discord 404 (idempotent — Pitfall 5)", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response("Not found", { status: 404 }),
    );
    const result = await removeDiscordRole("123456789012345678", "999");
    expect(result).toBe(true);
  });

  it("returns false on Discord 500", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response("Server error", { status: 500 }),
    );
    const result = await removeDiscordRole("123456789012345678", "999");
    expect(result).toBe(false);
  });

  it("returns false on Discord 403", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response("Forbidden", { status: 403 }),
    );
    const result = await removeDiscordRole("123456789012345678", "999");
    expect(result).toBe(false);
  });
});
