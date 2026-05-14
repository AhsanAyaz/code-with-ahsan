import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock constants — importing real file is fine, but keep test independent of any env
vi.mock("@/lib/ambassador/constants", () => ({
  REFERRAL_COOKIE_NAME: "cwa_ref",
  REFERRAL_COOKIE_MAX_AGE_SECONDS: 2592000,
}));

// Mock NextResponse.next() and NextResponse type
const cookieSetMock = vi.fn();
vi.mock("next/server", () => {
  class NextRequestMock {
    nextUrl: URL;
    cookies: { get: (name: string) => { value: string } | undefined };
    constructor(url: string, cookieValues: Record<string, string> = {}) {
      this.nextUrl = new URL(url);
      this.cookies = {
        get: (name: string) =>
          name in cookieValues ? { value: cookieValues[name] } : undefined,
      };
    }
  }
  return {
    NextRequest: NextRequestMock,
    NextResponse: {
      next: vi.fn(() => ({ cookies: { set: cookieSetMock } })),
    },
  };
});

import { middleware } from "./middleware";
import { NextRequest } from "next/server";

describe("middleware (REF-02)", () => {
  beforeEach(() => cookieSetMock.mockReset());

  it("sets cwa_ref cookie when ?ref= is present and no cookie exists", () => {
    cookieSetMock.mockReset();
    const req = new (NextRequest as unknown as new (u: string, c?: Record<string, string>) => NextRequest)(
      "https://example.com/ambassadors?ref=AHSAN-A7F2",
    );
    middleware(req);
    expect(cookieSetMock).toHaveBeenCalledWith(
      "cwa_ref",
      "AHSAN-A7F2",
      expect.objectContaining({
        maxAge: 2592000,
        sameSite: "lax",
        path: "/",
        httpOnly: true,
      }),
    );
  });

  it("does NOT set cookie when existing cwa_ref is present (preserves attribution)", () => {
    cookieSetMock.mockReset();
    const req = new (NextRequest as unknown as new (u: string, c?: Record<string, string>) => NextRequest)(
      "https://example.com/?ref=NEW-0000",
      { cwa_ref: "ORIGINAL-1111" },
    );
    middleware(req);
    expect(cookieSetMock).not.toHaveBeenCalled();
  });

  it("does NOT set cookie when ?ref= is empty", () => {
    cookieSetMock.mockReset();
    const req = new (NextRequest as unknown as new (u: string, c?: Record<string, string>) => NextRequest)(
      "https://example.com/?ref=",
    );
    middleware(req);
    expect(cookieSetMock).not.toHaveBeenCalled();
  });

  it("does NOT set cookie when ?ref= is whitespace only", () => {
    cookieSetMock.mockReset();
    const req = new (NextRequest as unknown as new (u: string, c?: Record<string, string>) => NextRequest)(
      "https://example.com/?ref=%20%20%20",
    );
    middleware(req);
    expect(cookieSetMock).not.toHaveBeenCalled();
  });

  it("does NOT set cookie when no ref param", () => {
    cookieSetMock.mockReset();
    const req = new (NextRequest as unknown as new (u: string, c?: Record<string, string>) => NextRequest)(
      "https://example.com/ambassadors",
    );
    middleware(req);
    expect(cookieSetMock).not.toHaveBeenCalled();
  });

  it("trims whitespace from the ref value before storing", () => {
    cookieSetMock.mockReset();
    const req = new (NextRequest as unknown as new (u: string, c?: Record<string, string>) => NextRequest)(
      "https://example.com/?ref=%20AHSAN-A7F2%20",
    );
    middleware(req);
    expect(cookieSetMock).toHaveBeenCalledWith("cwa_ref", "AHSAN-A7F2", expect.any(Object));
  });
});
