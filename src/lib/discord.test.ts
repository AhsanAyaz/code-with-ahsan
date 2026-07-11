/**
 * Phase 5 (DISC-05): unit coverage for removeDiscordRole.
 * Test boundary: mock global.fetch (fetchWithRateLimit ultimately calls it).
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { removeDiscordRole, isProtectedChannel, deleteDiscordChannel } from "./discord";

describe("removeDiscordRole (DISC-05)", () => {
  beforeEach(() => {
    process.env.DISCORD_BOT_TOKEN = "test-token";
    process.env.DISCORD_GUILD_ID = "1234567890";
    vi.restoreAllMocks();
  });

  it("returns true on Discord 204", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
    const result = await removeDiscordRole("123456789012345678", "999");
    expect(result).toBe(true);
  });

  it("returns true on Discord 404 (idempotent — Pitfall 5)", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(new Response("Not found", { status: 404 }));
    const result = await removeDiscordRole("123456789012345678", "999");
    expect(result).toBe(true);
  });

  it("returns false on Discord 500", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(new Response("Server error", { status: 500 }));
    const result = await removeDiscordRole("123456789012345678", "999");
    expect(result).toBe(false);
  });

  it("returns false on Discord 403", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(new Response("Forbidden", { status: 403 }));
    const result = await removeDiscordRole("123456789012345678", "999");
    expect(result).toBe(false);
  });
});

describe("protected channel deletion guard (VIS-141)", () => {
  beforeEach(() => {
    process.env.DISCORD_BOT_TOKEN = "test-token";
    process.env.DISCORD_GUILD_ID = "1234567890";
    vi.restoreAllMocks();
  });

  it("flags the moderators/registration channel as protected", () => {
    // Default MODERATORS_CHANNEL_ID (also the project-review channel).
    expect(isProtectedChannel("874565618458824715")).toBe(true);
  });

  it("flags the #find-a-mentor announcement channel as protected", () => {
    expect(isProtectedChannel("1419645845258768385")).toBe(true);
  });

  it("does not flag an ordinary per-mentorship channel", () => {
    expect(isProtectedChannel("999999999999999999")).toBe(false);
  });

  it("refuses to delete a protected channel and never calls Discord", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    const result = await deleteDiscordChannel("874565618458824715", "should be blocked");
    expect(result).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("deletes an ordinary channel (Discord 204)", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
    const result = await deleteDiscordChannel("999999999999999999", "ordinary delete");
    expect(result).toBe(true);
  });

  it("treats a 404 as an idempotent success", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(new Response("Not found", { status: 404 }));
    const result = await deleteDiscordChannel("999999999999999999", "already gone");
    expect(result).toBe(true);
  });
});
