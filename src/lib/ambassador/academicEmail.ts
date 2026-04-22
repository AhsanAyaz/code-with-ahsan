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
 * Hipo snapshot is ~2.2MB, so it is lazy-loaded once per process (pitfall #6 in RESEARCH.md).
 */

import { readFileSync } from "node:fs";
import path from "node:path";

/** Matches .edu, .edu.XX (e.g., .edu.pk), and .ac.XX (e.g., .ac.uk) TLDs. */
const ACADEMIC_TLD_REGEX = /\.edu(\.[a-z]{2})?$|\.ac\.[a-z]{2}$/i;

/** Pragmatic RFC 5322 subset — mirrors existing codebase convention. */
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
    const filePath = path.join(
      process.cwd(),
      "src/data/world_universities_and_domains.json"
    );
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
  /** True if the email passes the basic syntax check. */
  syntaxValid: boolean;
  /** True if the domain matches .edu, .edu.{cc}, or .ac.{cc} regex. */
  academicTldMatch: boolean;
  /** True if the domain is found in the Hipo university snapshot. */
  hipoMatch: boolean;
  /**
   * True if neither TLD match nor Hipo match succeeded.
   * Per D-15: this is a SOFT WARNING — never hard-reject.
   * The UI should suggest uploading a student ID as an alternative.
   */
  needsManualVerification: boolean;
  /** The domain portion of the email, lowercased. Null if syntaxValid=false. */
  normalizedDomain: string | null;
}

/**
 * Validates an academic email address with a two-layer check (APPLY-04, D-15).
 *
 * @param email - The email address to validate.
 * @returns AcademicEmailResult with per-layer flags and soft-warning signal.
 */
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
  const academicTldMatch = ACADEMIC_TLD_REGEX.test(domain);
  const hipoMatch = getHipoDomains().has(domain);
  const needsManualVerification = !academicTldMatch && !hipoMatch;

  return {
    syntaxValid: true,
    academicTldMatch,
    hipoMatch,
    needsManualVerification,
    normalizedDomain: domain,
  };
}
