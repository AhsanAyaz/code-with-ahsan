---
phase: 02-application-subsystem
plan: 02
type: tdd
wave: 1
depends_on: []
files_modified:
  - src/lib/ambassador/academicEmail.ts
  - src/lib/ambassador/videoUrl.ts
  - src/__tests__/ambassador/academicEmail.test.ts
  - src/__tests__/ambassador/videoUrl.test.ts
  - src/data/world_universities_and_domains.json
autonomous: true
requirements:
  - APPLY-03
  - APPLY-04
must_haves:
  truths:
    - "Video URL validator accepts every pattern listed in D-07 (loom.com/share/, youtu.be/, youtube.com/watch, youtube.com/shorts/, drive.google.com/file/d/) and rejects vimeo / tiktok / plain domains."
    - "Video URL classifier returns youtube | loom | drive | unknown for each URL — used server-side to set ApplicationDoc.videoEmbedType before write."
    - "Academic email validator recognizes .edu, .edu.{cc}, .ac.{cc} via regex AND recognizes university domains present in the bundled Hipo snapshot."
    - "An email with an unrecognized TLD (e.g., @gmail.com) returns { needsManualVerification: true } — NEVER hard-rejects per D-15."
    - "Hipo snapshot is read-once lazy-initialized so repeated validator calls in the same process don't reparse the 4.5MB JSON (pitfall #6 in RESEARCH.md)."
  artifacts:
    - path: "src/lib/ambassador/videoUrl.ts"
      provides: "isValidVideoUrl, classifyVideoUrl, extractLoomId, extractDriveFileId, extractYouTubeId"
      exports:
        - "isValidVideoUrl"
        - "classifyVideoUrl"
        - "extractLoomId"
        - "extractDriveFileId"
        - "extractYouTubeId"
    - path: "src/lib/ambassador/academicEmail.ts"
      provides: "validateAcademicEmail with layered check"
      exports:
        - "validateAcademicEmail"
        - "AcademicEmailResult"
    - path: "src/data/world_universities_and_domains.json"
      provides: "Hipo snapshot of 10k+ university domains"
      contains: "array of {domains: string[]}"
    - path: "src/__tests__/ambassador/academicEmail.test.ts"
      provides: "Unit tests for APPLY-04"
      min_lines: 60
    - path: "src/__tests__/ambassador/videoUrl.test.ts"
      provides: "Unit tests for APPLY-03"
      min_lines: 60
  key_links:
    - from: "src/lib/ambassador/academicEmail.ts"
      to: "src/data/world_universities_and_domains.json"
      via: "lazy-singleton import via node:fs at first call"
      pattern: "world_universities_and_domains"
    - from: "src/lib/ambassador/videoUrl.ts"
      to: "@/types/ambassador"
      via: "returns VideoEmbedType values from classifyVideoUrl"
      pattern: "VideoEmbedType|classifyVideoUrl"
---

<objective>
Build the two stateless validators that the application submission API route (Plan 05) and the admin detail page (Plan 08) depend on. Dedicated TDD plan because both validators have well-defined I/O contracts — RED-GREEN-REFACTOR yields better test coverage than embedding in a multi-task plan.

Purpose:
- APPLY-03: video URL format validation (regex ONLY per D-07 — no server-side fetch).
- APPLY-04: academic email validation with two-layer check (regex + Hipo snapshot); soft warning for unknown TLDs per D-15.

Output:
- `src/lib/ambassador/videoUrl.ts` with 5 exports used by submit route and admin embed.
- `src/lib/ambassador/academicEmail.ts` with `validateAcademicEmail()` used by submit route.
- `src/data/world_universities_and_domains.json` downloaded snapshot (lazy-loaded singleton).
- Matching unit tests with >= 20 assertions per file.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/phases/02-application-subsystem/02-CONTEXT.md
@.planning/phases/02-application-subsystem/02-RESEARCH.md

<interfaces>
<!-- From vitest.config.ts: vitest is pre-configured with @ alias to src/. -->

From src/types/ambassador.ts (Plan 01 output — will exist in Wave 1):
```typescript
export type VideoEmbedType = "youtube" | "loom" | "drive" | "unknown";
```

Hipo snapshot URL: https://raw.githubusercontent.com/Hipo/university-domains-list/master/world_universities_and_domains.json
Shape: `Array<{ name: string; domains: string[]; alpha_two_code: string; country: string; ... }>`
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: RED — write videoUrl tests, GREEN — implement videoUrl.ts</name>
  <files>src/__tests__/ambassador/videoUrl.test.ts, src/lib/ambassador/videoUrl.ts</files>
  <read_first>
    - .planning/phases/02-application-subsystem/02-CONTEXT.md (D-07, D-08 — video URL regex patterns)
    - .planning/phases/02-application-subsystem/02-RESEARCH.md ("Pattern 3: Video URL Detection and Embed" section — reference implementation of classifyVideoUrl and extractDriveFileId)
    - src/lib/validation/urls.ts (existing GitHub URL validator — mirror style: named exports, TSDoc comments, return typed shapes)
  </read_first>
  <behavior>
    RED: tests should fail initially because videoUrl.ts does not exist.

    Test file must cover:
    - isValidVideoUrl accepts: `https://loom.com/share/abc123`, `https://www.loom.com/share/XYZ`, `https://youtu.be/dQw4w9WgXcQ`, `https://www.youtube.com/watch?v=dQw4w9WgXcQ`, `https://youtube.com/shorts/abc`, `https://drive.google.com/file/d/1AbCdEfGh/view`
    - isValidVideoUrl rejects: `https://vimeo.com/123`, `https://tiktok.com/@x/video/1`, `https://example.com`, empty string, `not a url`, `https://fakeloom.com/share/x` (subdomain attack), `javascript:alert(1)`
    - classifyVideoUrl returns "youtube" for youtube URLs, "loom" for loom URLs, "drive" for drive URLs, "unknown" for vimeo/empty/malformed
    - extractLoomId returns the share id from `loom.com/share/{id}` and null for other URLs
    - extractDriveFileId returns file id from `drive.google.com/file/d/{id}/...` and null for other URLs
    - extractYouTubeId returns id from `youtu.be/{id}`, `youtube.com/watch?v={id}`, `youtube.com/shorts/{id}` and null for other URLs
  </behavior>
  <action>
Step A — RED: Create `src/__tests__/ambassador/videoUrl.test.ts` with this full content:

```typescript
import { describe, it, expect } from "vitest";
import {
  isValidVideoUrl,
  classifyVideoUrl,
  extractLoomId,
  extractDriveFileId,
  extractYouTubeId,
} from "@/lib/ambassador/videoUrl";

describe("isValidVideoUrl", () => {
  it.each([
    "https://loom.com/share/abc123",
    "https://www.loom.com/share/XYZ",
    "https://youtu.be/dQw4w9WgXcQ",
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtube.com/shorts/abc",
    "https://drive.google.com/file/d/1AbCdEfGh/view",
  ])("accepts %s", (url) => {
    expect(isValidVideoUrl(url)).toBe(true);
  });

  it.each([
    "https://vimeo.com/123",
    "https://tiktok.com/@x/video/1",
    "https://example.com",
    "",
    "not a url",
    "https://fakeloom.com/share/x",
    "javascript:alert(1)",
  ])("rejects %s", (url) => {
    expect(isValidVideoUrl(url)).toBe(false);
  });
});

describe("classifyVideoUrl", () => {
  it("returns youtube for youtube.com/watch", () => {
    expect(classifyVideoUrl("https://www.youtube.com/watch?v=abc")).toBe("youtube");
  });
  it("returns youtube for youtu.be short link", () => {
    expect(classifyVideoUrl("https://youtu.be/abc")).toBe("youtube");
  });
  it("returns youtube for youtube.com/shorts", () => {
    expect(classifyVideoUrl("https://youtube.com/shorts/abc")).toBe("youtube");
  });
  it("returns loom for loom.com/share", () => {
    expect(classifyVideoUrl("https://loom.com/share/xyz")).toBe("loom");
  });
  it("returns drive for drive.google.com/file/d", () => {
    expect(classifyVideoUrl("https://drive.google.com/file/d/1abc/view")).toBe("drive");
  });
  it("returns unknown for unrecognized URL", () => {
    expect(classifyVideoUrl("https://vimeo.com/123")).toBe("unknown");
  });
  it("returns unknown for empty string", () => {
    expect(classifyVideoUrl("")).toBe("unknown");
  });
});

describe("extractLoomId", () => {
  it("extracts id from loom.com/share/{id}", () => {
    expect(extractLoomId("https://loom.com/share/a1b2c3d4e5")).toBe("a1b2c3d4e5");
  });
  it("extracts id from www.loom.com/share/{id}", () => {
    expect(extractLoomId("https://www.loom.com/share/zzz")).toBe("zzz");
  });
  it("returns null for non-loom URL", () => {
    expect(extractLoomId("https://youtube.com/watch?v=abc")).toBeNull();
  });
});

describe("extractDriveFileId", () => {
  it("extracts id from /file/d/{id}/view", () => {
    expect(extractDriveFileId("https://drive.google.com/file/d/1AbCdEf/view")).toBe("1AbCdEf");
  });
  it("extracts id from /file/d/{id} without trailing segment", () => {
    expect(extractDriveFileId("https://drive.google.com/file/d/1AbCdEf")).toBe("1AbCdEf");
  });
  it("returns null for non-drive URL", () => {
    expect(extractDriveFileId("https://youtu.be/abc")).toBeNull();
  });
});

describe("extractYouTubeId", () => {
  it("extracts id from youtu.be/{id}", () => {
    expect(extractYouTubeId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });
  it("extracts id from youtube.com/watch?v={id}", () => {
    expect(extractYouTubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });
  it("extracts id from youtube.com/shorts/{id}", () => {
    expect(extractYouTubeId("https://youtube.com/shorts/abc123")).toBe("abc123");
  });
  it("returns null for non-youtube URL", () => {
    expect(extractYouTubeId("https://loom.com/share/x")).toBeNull();
  });
});
```

Run `npx vitest run src/__tests__/ambassador/videoUrl.test.ts` — it MUST fail with "Cannot find module '@/lib/ambassador/videoUrl'" (RED state confirmed).

Step B — GREEN: Create `src/lib/ambassador/videoUrl.ts`:

```typescript
/**
 * src/lib/ambassador/videoUrl.ts
 *
 * Stateless video URL validator + classifier for ambassador application submissions.
 *
 * DECISIONS:
 *   D-06: External video links only (no Firebase Storage video upload).
 *   D-07: Regex-only validation — never fetch the URL server-side.
 *   D-08: Classifier output drives admin embed rendering (react-lite-youtube-embed /
 *         Google Drive /preview iframe / Loom embed iframe).
 */

import type { VideoEmbedType } from "@/types/ambassador";

const LOOM_SHARE_REGEX = /^https:\/\/(?:www\.)?loom\.com\/share\/([A-Za-z0-9]+)/;
const YOUTUBE_WATCH_REGEX = /^https:\/\/(?:www\.)?youtube\.com\/watch\?(?:[^#]*&)?v=([A-Za-z0-9_-]{6,})/;
const YOUTUBE_SHORT_REGEX = /^https:\/\/youtu\.be\/([A-Za-z0-9_-]{6,})/;
const YOUTUBE_SHORTS_REGEX = /^https:\/\/(?:www\.)?youtube\.com\/shorts\/([A-Za-z0-9_-]{6,})/;
const DRIVE_FILE_REGEX = /^https:\/\/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)(?:\/|$)/;

/** Returns true if url matches one of the accepted patterns (D-07). */
export function isValidVideoUrl(url: string): boolean {
  if (typeof url !== "string" || url.length === 0) return false;
  return (
    LOOM_SHARE_REGEX.test(url) ||
    YOUTUBE_WATCH_REGEX.test(url) ||
    YOUTUBE_SHORT_REGEX.test(url) ||
    YOUTUBE_SHORTS_REGEX.test(url) ||
    DRIVE_FILE_REGEX.test(url)
  );
}

/** Classifies a video URL for the admin embed renderer (D-08). */
export function classifyVideoUrl(url: string): VideoEmbedType {
  if (typeof url !== "string" || url.length === 0) return "unknown";
  if (LOOM_SHARE_REGEX.test(url)) return "loom";
  if (YOUTUBE_WATCH_REGEX.test(url) || YOUTUBE_SHORT_REGEX.test(url) || YOUTUBE_SHORTS_REGEX.test(url)) {
    return "youtube";
  }
  if (DRIVE_FILE_REGEX.test(url)) return "drive";
  return "unknown";
}

export function extractLoomId(url: string): string | null {
  return url.match(LOOM_SHARE_REGEX)?.[1] ?? null;
}

export function extractDriveFileId(url: string): string | null {
  return url.match(DRIVE_FILE_REGEX)?.[1] ?? null;
}

export function extractYouTubeId(url: string): string | null {
  return (
    url.match(YOUTUBE_WATCH_REGEX)?.[1] ??
    url.match(YOUTUBE_SHORT_REGEX)?.[1] ??
    url.match(YOUTUBE_SHORTS_REGEX)?.[1] ??
    null
  );
}
```

Run `npx vitest run src/__tests__/ambassador/videoUrl.test.ts` — it MUST pass all tests (GREEN state).

Commit: `test(02-02): add failing tests for videoUrl validator` then `feat(02-02): implement videoUrl validator`.
  </action>
  <verify>
    <automated>npx vitest run src/__tests__/ambassador/videoUrl.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - File `src/__tests__/ambassador/videoUrl.test.ts` exists
    - File `src/lib/ambassador/videoUrl.ts` exists
    - `grep -c "^export" src/lib/ambassador/videoUrl.ts` returns 5
    - `grep -q "LOOM_SHARE_REGEX\|YOUTUBE_WATCH_REGEX\|DRIVE_FILE_REGEX" src/lib/ambassador/videoUrl.ts` exits 0
    - `npx vitest run src/__tests__/ambassador/videoUrl.test.ts` exits 0 and reports >= 22 passing assertions
    - `grep -q "https://fakeloom.com/share/x" src/__tests__/ambassador/videoUrl.test.ts` exits 0 (subdomain attack test present)
  </acceptance_criteria>
  <done>
    Both isValidVideoUrl and classifyVideoUrl have full coverage. Admin detail page (Plan 08) can call classifyVideoUrl at render time; submit route (Plan 05) can call isValidVideoUrl before write.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: RED — write academicEmail tests, fetch Hipo snapshot, GREEN — implement</name>
  <files>src/__tests__/ambassador/academicEmail.test.ts, src/lib/ambassador/academicEmail.ts, src/data/world_universities_and_domains.json</files>
  <read_first>
    - .planning/phases/02-application-subsystem/02-CONTEXT.md (D-15 — soft warning, not hard block)
    - .planning/phases/02-application-subsystem/02-RESEARCH.md ("Pattern 4: Academic Email Validation" + Pitfall 6 — Hipo file size, lazy singleton)
    - src/lib/ambassador/constants.ts (existing from Plan 01 — pattern reference)
  </read_first>
  <behavior>
    validateAcademicEmail(email) returns `{ syntaxValid, academicTldMatch, hipoMatch, needsManualVerification, normalizedDomain }`.

    Test cases:
    - `alice@mit.edu` → `{ syntaxValid: true, academicTldMatch: true, hipoMatch: true, needsManualVerification: false }`
    - `bob@lums.edu.pk` → `{ syntaxValid: true, academicTldMatch: true, needsManualVerification: false }` (TLD regex matches .edu.pk)
    - `carol@cam.ac.uk` → `{ syntaxValid: true, academicTldMatch: true, needsManualVerification: false }` (.ac.uk matches)
    - `dave@gmail.com` → `{ syntaxValid: true, academicTldMatch: false, hipoMatch: false, needsManualVerification: true }` (NOT rejected per D-15)
    - `NOT_AN_EMAIL` → `{ syntaxValid: false, ... }`
    - `eve@stanford.edu` → `{ syntaxValid: true, academicTldMatch: true, hipoMatch: true, needsManualVerification: false }`
    - Empty string / undefined → syntaxValid: false
    - Uppercase domain `@MIT.EDU` → syntaxValid: true AND hipoMatch: true (lowercase normalization)
  </behavior>
  <action>
Step A — RED: Create `src/__tests__/ambassador/academicEmail.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { validateAcademicEmail } from "@/lib/ambassador/academicEmail";

describe("validateAcademicEmail", () => {
  it("accepts @mit.edu (regex + Hipo)", () => {
    const r = validateAcademicEmail("alice@mit.edu");
    expect(r.syntaxValid).toBe(true);
    expect(r.academicTldMatch).toBe(true);
    expect(r.hipoMatch).toBe(true);
    expect(r.needsManualVerification).toBe(false);
  });

  it("accepts @lums.edu.pk via .edu.pk regex", () => {
    const r = validateAcademicEmail("bob@lums.edu.pk");
    expect(r.syntaxValid).toBe(true);
    expect(r.academicTldMatch).toBe(true);
    expect(r.needsManualVerification).toBe(false);
  });

  it("accepts @cam.ac.uk via .ac.uk regex", () => {
    const r = validateAcademicEmail("carol@cam.ac.uk");
    expect(r.syntaxValid).toBe(true);
    expect(r.academicTldMatch).toBe(true);
    expect(r.needsManualVerification).toBe(false);
  });

  it("flags @gmail.com for manual verification (D-15 soft warning, NOT hard reject)", () => {
    const r = validateAcademicEmail("dave@gmail.com");
    expect(r.syntaxValid).toBe(true);
    expect(r.academicTldMatch).toBe(false);
    expect(r.hipoMatch).toBe(false);
    expect(r.needsManualVerification).toBe(true);
  });

  it("returns syntaxValid=false for 'NOT_AN_EMAIL'", () => {
    const r = validateAcademicEmail("NOT_AN_EMAIL");
    expect(r.syntaxValid).toBe(false);
  });

  it("returns syntaxValid=false for empty string", () => {
    const r = validateAcademicEmail("");
    expect(r.syntaxValid).toBe(false);
  });

  it("accepts @stanford.edu via Hipo match", () => {
    const r = validateAcademicEmail("eve@stanford.edu");
    expect(r.hipoMatch).toBe(true);
    expect(r.needsManualVerification).toBe(false);
  });

  it("lowercases the domain before comparison (@MIT.EDU accepted)", () => {
    const r = validateAcademicEmail("someone@MIT.EDU");
    expect(r.syntaxValid).toBe(true);
    expect(r.hipoMatch).toBe(true);
    expect(r.normalizedDomain).toBe("mit.edu");
  });

  it("handles whitespace-only input as syntaxValid=false", () => {
    expect(validateAcademicEmail("   ").syntaxValid).toBe(false);
  });
});
```

Run `npx vitest run src/__tests__/ambassador/academicEmail.test.ts` — MUST fail (RED).

Step B — Download the Hipo snapshot using curl (one-time):
```
curl -fsSL "https://raw.githubusercontent.com/Hipo/university-domains-list/master/world_universities_and_domains.json" -o src/data/world_universities_and_domains.json
```
If the download fails or produces < 1MB, abort the task and surface the failure — do NOT hand-write a mock list. The file must be >= 1MB and contain valid JSON with `mit.edu` and `stanford.edu` domains.

Step C — GREEN: Create `src/lib/ambassador/academicEmail.ts`:

```typescript
/**
 * src/lib/ambassador/academicEmail.ts
 *
 * Academic email validator (APPLY-04).
 *
 * Two-layer check (D-15):
 *   Layer 1 — regex for .edu, .edu.{cc}, .ac.{cc}
 *   Layer 2 — lookup against bundled Hipo world-universities-and-domains snapshot
 *
 * Unknown TLD → { needsManualVerification: true } (soft warning, never hard reject).
 *
 * Hipo snapshot is ~4.5MB, so it is lazy-loaded once per process (pitfall #6 in RESEARCH.md).
 */

import { readFileSync } from "node:fs";
import path from "node:path";

const ACADEMIC_TLD_REGEX = /\.edu(\.[a-z]{2})?$|\.ac\.[a-z]{2}$/i;
// RFC 5322 is gnarly; this is a pragmatic check mirroring the existing codebase convention.
const EMAIL_REGEX = /^[^\s@]+@[^\s@.]+\.[^\s@]+$/;

interface HipoUniversity {
  name: string;
  domains: string[];
  alpha_two_code: string;
  country: string;
}

let hipoDomainSet: Set<string> | null = null;

/** Lazy-load + cache the Hipo domain set as Set<string> (lowercase) for O(1) lookup. */
function getHipoDomains(): Set<string> {
  if (hipoDomainSet) return hipoDomainSet;
  try {
    const filePath = path.join(process.cwd(), "src/data/world_universities_and_domains.json");
    const raw = readFileSync(filePath, "utf-8");
    const universities = JSON.parse(raw) as HipoUniversity[];
    hipoDomainSet = new Set<string>();
    for (const u of universities) {
      for (const d of u.domains ?? []) {
        hipoDomainSet.add(d.toLowerCase());
      }
    }
  } catch {
    // File missing or malformed — degrade to regex-only per RESEARCH.md fallback.
    hipoDomainSet = new Set<string>();
  }
  return hipoDomainSet;
}

export interface AcademicEmailResult {
  syntaxValid: boolean;
  academicTldMatch: boolean;
  hipoMatch: boolean;
  needsManualVerification: boolean;
  normalizedDomain: string | null;
}

export function validateAcademicEmail(email: string): AcademicEmailResult {
  if (typeof email !== "string" || email.trim().length === 0) {
    return {
      syntaxValid: false,
      academicTldMatch: false,
      hipoMatch: false,
      needsManualVerification: false,
      normalizedDomain: null,
    };
  }
  const trimmed = email.trim();
  if (!EMAIL_REGEX.test(trimmed)) {
    return {
      syntaxValid: false,
      academicTldMatch: false,
      hipoMatch: false,
      needsManualVerification: false,
      normalizedDomain: null,
    };
  }
  const domain = trimmed.split("@")[1]?.toLowerCase() ?? "";
  const tldMatch = ACADEMIC_TLD_REGEX.test(domain);
  const hipoMatch = getHipoDomains().has(domain);
  const needsManualVerification = !tldMatch && !hipoMatch;
  return {
    syntaxValid: true,
    academicTldMatch: tldMatch,
    hipoMatch,
    needsManualVerification,
    normalizedDomain: domain,
  };
}
```

Run `npx vitest run src/__tests__/ambassador/academicEmail.test.ts` — MUST pass all tests (GREEN).

Commits:
1. `test(02-02): add failing tests for academicEmail validator`
2. `chore(02-02): bundle Hipo university domains snapshot`
3. `feat(02-02): implement academicEmail validator`
  </action>
  <verify>
    <automated>test -f src/data/world_universities_and_domains.json && test $(wc -c < src/data/world_universities_and_domains.json) -gt 1000000 && grep -q "mit.edu" src/data/world_universities_and_domains.json && npx vitest run src/__tests__/ambassador/academicEmail.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - File `src/data/world_universities_and_domains.json` exists and is > 1,000,000 bytes
    - File contains string `mit.edu` and `stanford.edu` (grep exits 0 for both)
    - File `src/lib/ambassador/academicEmail.ts` exists
    - `grep -c "^export" src/lib/ambassador/academicEmail.ts` >= 2 (validateAcademicEmail + AcademicEmailResult)
    - `grep -q "ACADEMIC_TLD_REGEX = /\\\\.edu" src/lib/ambassador/academicEmail.ts` confirms regex exists
    - `grep -q "hipoDomainSet" src/lib/ambassador/academicEmail.ts` confirms lazy cache pattern
    - `npx vitest run src/__tests__/ambassador/academicEmail.test.ts` exits 0 with >= 9 passing tests
    - `grep -q "needsManualVerification: true" src/__tests__/ambassador/academicEmail.test.ts` exits 0 (gmail test present — D-15 soft-warning enforced)
  </acceptance_criteria>
  <done>
    Submit route (Plan 05) can call `validateAcademicEmail(email)` and write the result into `ApplicationDoc.academicEmailVerified` + surface a `needsManualVerification` warning on the wizard UI (Plan 07).
  </done>
</task>

</tasks>

<verification>
```
npx vitest run src/__tests__/ambassador/
npx tsc --noEmit
```
Both exit 0. Test files report >= 30 total passing assertions across videoUrl + academicEmail.
</verification>

<success_criteria>
- `src/lib/ambassador/videoUrl.ts` and `src/lib/ambassador/academicEmail.ts` exist and compile
- Hipo snapshot bundled at `src/data/world_universities_and_domains.json` (>=1MB)
- Both test files pass with comprehensive coverage (regex + Hipo + soft-warning + edge cases)
- No other files modified
</success_criteria>

<output>
After completion, create `.planning/phases/02-application-subsystem/02-02-SUMMARY.md` documenting:
- Exported functions (with signatures)
- Hipo snapshot version/date (md5 or sha256 of the downloaded JSON)
- Regex patterns (listed explicitly for downstream test authors)
- Lazy-singleton pattern for Hipo lookup
</output>
