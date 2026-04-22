"use client";
import { APPLICATION_VIDEO_PROMPTS } from "@/lib/ambassador/constants";
import type { useApplyForm } from "../useApplyForm";

export default function ReviewStep({
  form,
  onBack,
  onSubmit,
  submitting,
}: {
  form: ReturnType<typeof useApplyForm>;
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  const v = form.values;

  const fields: Array<[string, string]> = [
    ["Name", v.applicantName || "(not set)"],
    ["Cohort", v.targetCohortId || "(not set)"],
    ["University", v.university],
    ["Year of study", v.yearOfStudy],
    ["Location", `${v.city}, ${v.country}`],
    ["Discord handle", v.discordHandle],
    [
      "Academic verification",
      v._academicPath === "email"
        ? v.academicEmail ?? ""
        : v.studentIdStoragePath
        ? "Student ID uploaded"
        : "(not set)",
    ],
    ["Video", v.videoUrl],
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Review your application</h2>
      <p className="text-base-content/70 text-sm">
        Please review your answers before submitting. You can go back to make
        changes.
      </p>

      {/* Key fields */}
      <div className="card bg-base-200">
        <div className="card-body p-4">
          <dl className="grid grid-cols-[min-content_1fr] gap-x-4 gap-y-2 text-sm">
            {fields.map(([label, val]) => (
              <div key={label} className="contents">
                <dt className="font-semibold whitespace-nowrap">{label}</dt>
                <dd className="break-words">{val}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* Prompt answers */}
      {(["motivation", "experience", "pitch"] as const).map((k, i) => (
        <div key={k} className="card bg-base-100 border border-base-300">
          <div className="card-body p-4">
            <h3 className="font-semibold text-sm">
              Prompt {i + 1}: {APPLICATION_VIDEO_PROMPTS[i]}
            </h3>
            <p className="whitespace-pre-wrap text-sm mt-1">{v[k]}</p>
          </div>
        </div>
      ))}

      <div className="flex justify-between pt-4">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={onBack}
          disabled={submitting}
        >
          Back
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <>
              <span className="loading loading-spinner loading-sm" />
              Submitting…
            </>
          ) : (
            "Submit application"
          )}
        </button>
      </div>
    </div>
  );
}
