"use client";
import { useState } from "react";
import { authFetch } from "@/lib/apiClient";
import { APPLICATION_VIDEO_PROMPTS } from "@/lib/ambassador/constants";
import type { useApplyForm } from "../useApplyForm";

/**
 * Client-safe regex-based academic email check (D-15).
 *
 * Mirrors the regex layer of src/lib/ambassador/academicEmail.ts.
 * The full Hipo-domain check is server-side only (readFileSync).
 */
function checkAcademicEmail(email: string): { syntaxValid: boolean; needsManualVerification: boolean } {
  const EMAIL_REGEX = /^[^\s@]+@[^\s@.]+\.[^\s@]+$/;
  const ACADEMIC_TLD_REGEX = /\.edu(\.[a-z]{2})?$|\.ac\.[a-z]{2}$/i;
  if (!EMAIL_REGEX.test(email.trim())) return { syntaxValid: false, needsManualVerification: false };
  const domain = email.trim().split("@")[1]?.toLowerCase() ?? "";
  return {
    syntaxValid: true,
    needsManualVerification: !ACADEMIC_TLD_REGEX.test(domain),
  };
}

export default function ApplicationStep({
  form,
  onNext,
  onBack,
}: {
  form: ReturnType<typeof useApplyForm>;
  onNext: () => void;
  onBack: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  /** D-15: soft warning fires on blur when TLD is not recognized */
  const handleAcademicEmailBlur = (email: string) => {
    if (!email) return;
    const { syntaxValid, needsManualVerification } = checkAcademicEmail(email);
    if (syntaxValid && needsManualVerification) {
      form.setField(
        "_academicEmailWarning",
        "We couldn't auto-verify this email address. You can continue — or choose \"I don't have a .edu email\" to upload a student ID instead."
      );
    } else {
      form.setField("_academicEmailWarning", undefined);
    }
  };

  /**
   * APPLY-05: POST to get signed URL → PUT file bytes directly to GCS.
   * Runs at form-submit time (not on file-change) so a failed upload blocks
   * the wizard from advancing. Returns true on success, false on any failure.
   */
  const uploadStudentId = async (file: File): Promise<boolean> => {
    setUploading(true);
    setUploadError(null);
    try {
      // Client-generated UUID used only for the storage path; not the Firestore doc id.
      const tempId =
        (crypto as Crypto & { randomUUID?: () => string }).randomUUID?.() ??
        `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const signedRes = await authFetch(
        "/api/ambassador/applications/student-id-upload-url",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            applicationId: tempId,
            contentType: file.type,
            fileSizeBytes: file.size,
          }),
        }
      );
      if (!signedRes.ok) {
        throw new Error(
          signedRes.status === 401
            ? "You need to be signed in to upload."
            : "Could not start upload. Please try again."
        );
      }

      const { uploadUrl, storagePath } = (await signedRes.json()) as {
        uploadUrl: string;
        storagePath: string;
      };

      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) throw new Error("Upload failed. Please try again.");

      form.setField("studentIdStoragePath", storagePath);
      return true;
    } catch (err) {
      form.setField("studentIdStoragePath", "");
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
      return false;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploading) return;
    if (form.values._academicPath === "studentId") {
      const file = form.values._studentIdFile;
      if (!file) {
        setUploadError("Select a student ID photo before continuing.");
        return;
      }
      // Always re-upload on submit so a failed/partial earlier attempt can't
      // leave a stale path in state.
      const ok = await uploadStudentId(file);
      if (!ok) return;
    }
    onNext();
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {/* Three motivation prompts (D-04) using APPLICATION_VIDEO_PROMPTS from constants */}
      {(["motivation", "experience", "pitch"] as const).map((key, i) => (
        <fieldset key={key}>
          <label className="label">
            <span className="label-text font-semibold">
              {APPLICATION_VIDEO_PROMPTS[i]}
            </span>
          </label>
          <textarea
            className={`textarea textarea-bordered w-full h-32 ${
              form.errors[key] ? "textarea-error" : ""
            }`}
            value={form.values[key]}
            onChange={(e) => form.setField(key, e.target.value)}
          />
          <div className="flex justify-between text-xs mt-1">
            <span className="text-error">{form.errors[key] ?? " "}</span>
            <span className="opacity-60">
              {form.values[key].length} chars (min 50)
            </span>
          </div>
        </fieldset>
      ))}

      {/* Discord handle */}
      <fieldset>
        <label className="label">
          <span className="label-text font-semibold">
            Discord handle (e.g. ahsanayaz)
          </span>
        </label>
        <input
          type="text"
          className={`input input-bordered w-full ${
            form.errors.discordHandle ? "input-error" : ""
          }`}
          placeholder="your_discord_username"
          value={form.values.discordHandle}
          onChange={(e) => form.setField("discordHandle", e.target.value)}
        />
        {form.errors.discordHandle && (
          <span className="text-error text-sm">
            {form.errors.discordHandle}
          </span>
        )}
      </fieldset>

      {/* Academic verification — D-13 explicit two-path choice */}
      <fieldset className="border border-base-300 rounded-lg p-4">
        <legend className="px-2 font-semibold">Academic verification</legend>
        <div className="flex flex-wrap gap-4 mb-4">
          <label className="label cursor-pointer gap-2">
            <input
              type="radio"
              className="radio radio-primary"
              name="academicPath"
              checked={form.values._academicPath === "email"}
              onChange={() => {
                form.setField("_academicPath", "email");
                form.setField("studentIdStoragePath", "");
              }}
            />
            <span>I have an academic email</span>
          </label>
          <label className="label cursor-pointer gap-2">
            <input
              type="radio"
              className="radio radio-primary"
              name="academicPath"
              checked={form.values._academicPath === "studentId"}
              onChange={() => {
                form.setField("_academicPath", "studentId");
                form.setField("academicEmail", "");
                form.setField("_academicEmailWarning", undefined);
              }}
            />
            <span>I don&apos;t have a .edu email</span>
          </label>
        </div>
        {form.errors._academicPath && (
          <div className="text-error text-sm mb-2">
            {form.errors._academicPath}
          </div>
        )}

        {/* Email path */}
        {form.values._academicPath === "email" && (
          <div>
            <input
              type="email"
              className={`input input-bordered w-full ${
                form.errors.academicEmail ? "input-error" : ""
              }`}
              value={form.values.academicEmail ?? ""}
              onChange={(e) => form.setField("academicEmail", e.target.value)}
              onBlur={(e) => handleAcademicEmailBlur(e.target.value)}
              placeholder="you@university.edu"
            />
            {form.errors.academicEmail && (
              <span className="text-error text-sm">
                {form.errors.academicEmail}
              </span>
            )}
            {/* D-15 soft warning — form still submittable */}
            {form.values._academicEmailWarning && (
              <div className="alert alert-warning mt-2 text-sm">
                {form.values._academicEmailWarning}
              </div>
            )}
          </div>
        )}

        {/* Student ID upload path */}
        {form.values._academicPath === "studentId" && (
          <div>
            <label className="label">
              <span className="label-text text-sm">
                Upload a photo of your student ID (JPEG, PNG, or WebP)
              </span>
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="file-input file-input-bordered w-full"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                form.setField("_studentIdFile", f);
                // Discard any prior upload path — the new file must upload
                // on submit before the step is allowed to advance.
                if (form.values.studentIdStoragePath) {
                  form.setField("studentIdStoragePath", "");
                }
                setUploadError(null);
              }}
              disabled={uploading}
            />
            {form.values._studentIdFile && !uploading && (
              <div className="text-sm opacity-70 mt-1">
                Selected: {form.values._studentIdFile.name} — uploads when
                you click Continue.
              </div>
            )}
            {uploading && (
              <div className="flex items-center gap-2 mt-1 text-sm opacity-60">
                <span className="loading loading-spinner loading-xs" />
                Uploading…
              </div>
            )}
            {uploadError && (
              <div className="text-error text-sm mt-1">{uploadError}</div>
            )}
            {form.errors.studentIdStoragePath && !uploadError && (
              <div className="text-error text-sm mt-1">
                {form.errors.studentIdStoragePath}
              </div>
            )}
          </div>
        )}
      </fieldset>

      {/* Video URL */}
      <fieldset>
        <label className="label">
          <span className="label-text font-semibold">
            Video link (Loom, YouTube, or Google Drive)
          </span>
        </label>
        <input
          type="url"
          className={`input input-bordered w-full ${
            form.errors.videoUrl ? "input-error" : ""
          }`}
          value={form.values.videoUrl}
          onChange={(e) => form.setField("videoUrl", e.target.value)}
          placeholder="https://www.loom.com/share/…"
        />
        {form.errors.videoUrl && (
          <span className="text-error text-sm">{form.errors.videoUrl}</span>
        )}
        <label className="label">
          <span className="label-text-alt opacity-60">
            Record a short 2–3 min video answering the prompts above. Paste the
            share link here.
          </span>
        </label>
      </fieldset>

      <div className="flex justify-between pt-4">
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          Back
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={uploading}
        >
          Continue
        </button>
      </div>
    </form>
  );
}
