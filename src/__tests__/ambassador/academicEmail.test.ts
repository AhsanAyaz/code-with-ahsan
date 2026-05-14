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
