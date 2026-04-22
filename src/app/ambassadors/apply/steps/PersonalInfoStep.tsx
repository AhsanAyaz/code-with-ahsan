"use client";
import { useEffect, useState } from "react";
import type { useApplyForm } from "../useApplyForm";

type CohortItem = {
  cohortId: string;
  name: string;
  startDate: string;
  endDate: string;
};

/**
 * CohortListResponse mirrors Plan 04 Task 3's GET /api/ambassador/cohorts?scope=open shape.
 * KEY-LINK: property is `cohorts`, NOT `items`. The admin list route (Plan 04 Task 2)
 * uses `items`; do not confuse the two shapes.
 */
type CohortListResponse = { cohorts?: CohortItem[] };

export default function PersonalInfoStep({
  form,
  onNext,
  onBack,
}: {
  form: ReturnType<typeof useApplyForm>;
  onNext: () => void;
  onBack: () => void;
}) {
  const [cohorts, setCohorts] = useState<CohortItem[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ambassador/cohorts?scope=open")
      .then((r) => r.json() as Promise<CohortListResponse>)
      .then((b) => setCohorts(b.cohorts ?? []))
      .catch(() => setCohorts([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <span className="loading loading-spinner loading-md" />
      </div>
    );
  }

  if (cohorts && cohorts.length === 0) {
    return (
      <div className="alert alert-info shadow-md">
        <div>
          <p className="font-semibold">No open cohorts right now.</p>
          <p>
            We&apos;ll announce the next application window on Discord and by
            email. Check back soon!
          </p>
          <p className="mt-2 text-sm opacity-70">
            (Notify-me subscription coming soon.)
          </p>
        </div>
      </div>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onNext();
      }}
    >
      {/* Full name */}
      <fieldset>
        <label className="label">
          <span className="label-text font-semibold">Full name</span>
        </label>
        <input
          type="text"
          className={`input input-bordered w-full ${
            form.errors.applicantName ? "input-error" : ""
          }`}
          placeholder="Your full name"
          value={form.values.applicantName}
          onChange={(e) => form.setField("applicantName", e.target.value)}
        />
        {form.errors.applicantName && (
          <span className="text-error text-sm">{form.errors.applicantName}</span>
        )}
      </fieldset>

      {/* Cohort selector */}
      <fieldset>
        <label className="label">
          <span className="label-text font-semibold">Target cohort</span>
        </label>
        <select
          className={`select select-bordered w-full ${
            form.errors.targetCohortId ? "select-error" : ""
          }`}
          value={form.values.targetCohortId}
          onChange={(e) => form.setField("targetCohortId", e.target.value)}
        >
          <option value="">— Select a cohort —</option>
          {(cohorts ?? []).map((c) => (
            <option key={c.cohortId} value={c.cohortId}>
              {c.name}
            </option>
          ))}
        </select>
        {form.errors.targetCohortId && (
          <span className="text-error text-sm">
            {form.errors.targetCohortId}
          </span>
        )}
      </fieldset>

      {/* University */}
      <fieldset>
        <label className="label">
          <span className="label-text font-semibold">University / Institution</span>
        </label>
        <input
          type="text"
          className={`input input-bordered w-full ${
            form.errors.university ? "input-error" : ""
          }`}
          placeholder="e.g. University of Lahore"
          value={form.values.university}
          onChange={(e) => form.setField("university", e.target.value)}
        />
        {form.errors.university && (
          <span className="text-error text-sm">{form.errors.university}</span>
        )}
      </fieldset>

      {/* Year of study */}
      <fieldset>
        <label className="label">
          <span className="label-text font-semibold">Year of study</span>
        </label>
        <select
          className={`select select-bordered w-full ${
            form.errors.yearOfStudy ? "select-error" : ""
          }`}
          value={form.values.yearOfStudy}
          onChange={(e) => form.setField("yearOfStudy", e.target.value)}
        >
          <option value="">— Select —</option>
          <option value="1">1st year</option>
          <option value="2">2nd year</option>
          <option value="3">3rd year</option>
          <option value="4">4th year</option>
          <option value="5+">5th year or beyond</option>
          <option value="graduate">Graduate student</option>
        </select>
        {form.errors.yearOfStudy && (
          <span className="text-error text-sm">{form.errors.yearOfStudy}</span>
        )}
      </fieldset>

      {/* Country + City */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <fieldset>
          <label className="label">
            <span className="label-text font-semibold">Country</span>
          </label>
          <input
            type="text"
            className={`input input-bordered w-full ${
              form.errors.country ? "input-error" : ""
            }`}
            placeholder="e.g. Pakistan"
            value={form.values.country}
            onChange={(e) => form.setField("country", e.target.value)}
          />
          {form.errors.country && (
            <span className="text-error text-sm">{form.errors.country}</span>
          )}
        </fieldset>
        <fieldset>
          <label className="label">
            <span className="label-text font-semibold">City</span>
          </label>
          <input
            type="text"
            className={`input input-bordered w-full ${
              form.errors.city ? "input-error" : ""
            }`}
            placeholder="e.g. Lahore"
            value={form.values.city}
            onChange={(e) => form.setField("city", e.target.value)}
          />
          {form.errors.city && (
            <span className="text-error text-sm">{form.errors.city}</span>
          )}
        </fieldset>
      </div>

      <div className="flex justify-between pt-4">
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          Back
        </button>
        <button type="submit" className="btn btn-primary">
          Continue
        </button>
      </div>
    </form>
  );
}
