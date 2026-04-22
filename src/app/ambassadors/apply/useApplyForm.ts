"use client";
import { useCallback, useState } from "react";
import type { ApplicationSubmitInput } from "@/types/ambassador";
import { isValidVideoUrl } from "@/lib/ambassador/videoUrl";

/**
 * Client-safe regex-based academic email check (D-15).
 *
 * The server-side validateAcademicEmail (src/lib/ambassador/academicEmail.ts)
 * uses readFileSync for Hipo domain lookup — a Node.js API unavailable in the
 * browser bundle. This helper replicates only the regex layer, which is the
 * only layer available client-side. The server still runs the full two-layer
 * check on submission.
 *
 * Returns { syntaxValid, academicTldMatch, needsManualVerification }.
 *   needsManualVerification = syntaxValid && !academicTldMatch
 *   (without Hipo data the regex is the only gate — soft warning fires on any
 *    non-.edu/.ac domain so the user knows to bring a student ID as backup)
 */
function validateAcademicEmailClient(email: string): {
  syntaxValid: boolean;
  academicTldMatch: boolean;
  needsManualVerification: boolean;
} {
  const EMAIL_REGEX = /^[^\s@]+@[^\s@.]+\.[^\s@]+$/;
  const ACADEMIC_TLD_REGEX = /\.edu(\.[a-z]{2})?$|\.ac\.[a-z]{2}$/i;

  if (typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
    return { syntaxValid: false, academicTldMatch: false, needsManualVerification: false };
  }
  const domain = email.trim().split("@")[1]?.toLowerCase() ?? "";
  const academicTldMatch = ACADEMIC_TLD_REGEX.test(domain);
  return {
    syntaxValid: true,
    academicTldMatch,
    needsManualVerification: !academicTldMatch,
  };
}

export type ApplyFormState = ApplicationSubmitInput & {
  _academicPath: "email" | "studentId" | null; // D-13 explicit choice
  _studentIdFile?: File | null;                 // local-only; cleared after upload
  _academicEmailWarning?: string;               // D-15 soft warning
};

const EMPTY: ApplyFormState = {
  applicantName: "",
  targetCohortId: "",
  university: "",
  yearOfStudy: "",
  country: "",
  city: "",
  discordHandle: "",
  academicEmail: "",
  studentIdStoragePath: "",
  academicVerificationPath: "email",
  motivation: "",
  experience: "",
  pitch: "",
  videoUrl: "",
  _academicPath: null,
};

const MIN_PROMPT_LENGTH = 50; // mirrors ApplicationSubmitSchema min(50)

export function useApplyForm() {
  const [values, setValues] = useState<ApplyFormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setField = useCallback(<K extends keyof ApplyFormState>(key: K, value: ApplyFormState[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => {
      if (!e[key as string]) return e;
      const { [key as string]: _removed, ...rest } = e;
      return rest;
    });
  }, []);

  /** Per-step validation. Returns true if the step passes. */
  const validateStep = useCallback((step: 1 | 2 | 3 | 4): boolean => {
    const e: Record<string, string> = {};
    if (step === 2) {
      if (!values.applicantName || values.applicantName.trim().length < 2)
        e.applicantName = "Enter your full name (at least 2 characters).";
      if (!values.targetCohortId) e.targetCohortId = "Select a cohort.";
      if (!values.university) e.university = "Required.";
      if (!values.yearOfStudy) e.yearOfStudy = "Required.";
      if (!values.country) e.country = "Required.";
      if (!values.city) e.city = "Required.";
    }
    if (step === 3) {
      if (values.motivation.trim().length < MIN_PROMPT_LENGTH)
        e.motivation = `Please write at least ${MIN_PROMPT_LENGTH} characters.`;
      if (values.experience.trim().length < MIN_PROMPT_LENGTH)
        e.experience = `Please write at least ${MIN_PROMPT_LENGTH} characters.`;
      if (values.pitch.trim().length < MIN_PROMPT_LENGTH)
        e.pitch = `Please write at least ${MIN_PROMPT_LENGTH} characters.`;
      if (!values.discordHandle.trim()) e.discordHandle = "Enter your Discord handle.";
      if (!values.videoUrl || !isValidVideoUrl(values.videoUrl))
        e.videoUrl = "Paste a Loom, YouTube, or Google Drive link.";
      if (values._academicPath === null)
        e._academicPath = "Choose an academic-verification path.";
      if (values._academicPath === "email") {
        if (!values.academicEmail) {
          e.academicEmail = "Enter your academic email.";
        } else {
          const r = validateAcademicEmailClient(values.academicEmail);
          if (!r.syntaxValid) e.academicEmail = "Enter a valid email address.";
        }
      }
      if (values._academicPath === "studentId" && !values.studentIdStoragePath)
        e.studentIdStoragePath = "Upload your student ID.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [values]);

  /**
   * Build the submit payload — strip local-only fields (underscore-prefixed)
   * and set academicVerificationPath to match the chosen _academicPath.
   * Returned shape matches ApplicationSubmitInput (Plan 01 Zod schema).
   */
  const buildSubmitPayload = useCallback((): ApplicationSubmitInput => {
    const {
      _academicPath,
      _studentIdFile,
      _academicEmailWarning,
      ...submit
    } = values;
    if (_academicPath === "email") {
      return {
        ...submit,
        academicVerificationPath: "email",
        studentIdStoragePath: undefined,
      };
    }
    if (_academicPath === "studentId") {
      return {
        ...submit,
        academicVerificationPath: "student_id",
        academicEmail: undefined,
      };
    }
    return { ...submit, academicVerificationPath: "email" };
  }, [values]);

  return { values, errors, setField, validateStep, buildSubmitPayload };
}
