"use client";

import { Award, GraduationCap } from "lucide-react";

export type AmbassadorBadgeRole = "ambassador" | "alumni-ambassador";

interface AmbassadorBadgeProps {
  role: AmbassadorBadgeRole;
  /** Optional size modifier — maps to DaisyUI badge sizes. Default: "md". */
  size?: "sm" | "md" | "lg";
  /** Optional extra className appended after the DaisyUI classes. */
  className?: string;
}

/**
 * Ambassador / Alumni Ambassador pill (PRESENT-02, D-10).
 *
 * Single component, two variants. Phase 5's alumni transition reuses this
 * unchanged by switching the `role` prop — NO Phase 3 code edits required
 * when Phase 5 adds its own call-sites.
 *
 * Badge placement scoped to /u/[username] only for Phase 3 (D-11). MentorCard
 * integration, project/roadmap byline chips, etc. are deferred to a future
 * quick task.
 */
export default function AmbassadorBadge({
  role,
  size = "md",
  className = "",
}: AmbassadorBadgeProps) {
  const sizeClass = size === "sm" ? "badge-sm" : size === "lg" ? "badge-lg" : "";
  if (role === "ambassador") {
    return (
      <span
        className={`badge badge-primary gap-1 ${sizeClass} ${className}`.trim()}
        title="Code With Ahsan Student Ambassador"
      >
        <Award className="h-3 w-3" aria-hidden="true" />
        Ambassador
      </span>
    );
  }
  // role === "alumni-ambassador"
  return (
    <span
      className={`badge badge-secondary gap-1 ${sizeClass} ${className}`.trim()}
      title="Code With Ahsan Alumni Ambassador"
    >
      <GraduationCap className="h-3 w-3" aria-hidden="true" />
      Alumni Ambassador
    </span>
  );
}
