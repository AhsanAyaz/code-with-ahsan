import type { ReactNode } from "react";

interface SectionEyebrowProps {
  /** The bracketed tag name, e.g. "work", "testimonials", "trusted-by" */
  tag: string;
  /** Optional descriptive tail rendered after the tag, e.g. "— built and shared with the community" */
  children?: ReactNode;
  /** Alignment of the eyebrow row. Defaults to centered (matches the sponsors analog). */
  align?: "center" | "left";
}

/**
 * Shared bracketed-mono eyebrow — the phase's signature motif.
 *
 * Renders a lowercase, self-closing tag (e.g. `<work />`) in the JetBrains Mono
 * utility register: `font-mono text-xs tracking-widest text-base-content/40`.
 * Presentational only — no data flow, no client directive needed.
 */
export default function SectionEyebrow({ tag, children, align = "center" }: SectionEyebrowProps) {
  return (
    <p
      className={`${
        align === "center" ? "text-center" : "text-left"
      } text-xs font-mono text-base-content/40 tracking-widest mb-3`}
    >
      &lt;{tag} /&gt;
      {children ? <span className="ml-2">{children}</span> : null}
    </p>
  );
}
