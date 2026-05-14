import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock firebaseAdmin BEFORE importing referralCode
const getMock = vi.fn();
vi.mock("@/lib/firebaseAdmin", () => ({
  db: {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({ get: getMock })),
    })),
  },
}));

import { buildCode, generateUniqueReferralCode } from "./referralCode";

describe("buildCode", () => {
  it("produces {PREFIX}-{4HEX} from a simple username", () => {
    const code = buildCode("ahsan");
    expect(code).toMatch(/^AHSAN-[0-9A-F]{4}$/);
  });

  it("uppercases the prefix", () => {
    const code = buildCode("mario");
    expect(code.startsWith("MARIO-")).toBe(true);
  });

  it("replaces non-alphanumeric characters with X", () => {
    const code = buildCode("a.b-c");
    // "a.b-c" → "aXbXc" → "AXBXC"
    expect(code).toMatch(/^AXBXC-[0-9A-F]{4}$/);
  });

  it("handles short usernames without padding", () => {
    const code = buildCode("ab");
    expect(code).toMatch(/^AB-[0-9A-F]{4}$/);
  });

  it("falls back to X for empty username", () => {
    const code = buildCode("");
    expect(code).toMatch(/^X-[0-9A-F]{4}$/);
  });

  it("truncates to first 5 chars", () => {
    const code = buildCode("verylongusername");
    expect(code).toMatch(/^VERYL-[0-9A-F]{4}$/);
  });
});

describe("generateUniqueReferralCode", () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it("returns a unique code when no collision", async () => {
    getMock.mockResolvedValue({ exists: false });
    const code = await generateUniqueReferralCode("ahsan");
    expect(code).toMatch(/^AHSAN-[0-9A-F]{4}$/);
    expect(getMock).toHaveBeenCalledTimes(1);
  });

  it("retries on collision and returns second attempt", async () => {
    getMock
      .mockResolvedValueOnce({ exists: true })
      .mockResolvedValueOnce({ exists: false });
    const code = await generateUniqueReferralCode("ahsan");
    expect(code).toMatch(/^AHSAN-[0-9A-F]{4}$/);
    expect(getMock).toHaveBeenCalledTimes(2);
  });

  it("throws after 5 consecutive collisions", async () => {
    getMock.mockResolvedValue({ exists: true });
    await expect(generateUniqueReferralCode("ahsan")).rejects.toThrow(
      /Could not generate unique referral code/,
    );
    expect(getMock).toHaveBeenCalledTimes(5);
  });
});
