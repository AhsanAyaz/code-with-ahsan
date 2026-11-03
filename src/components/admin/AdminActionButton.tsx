"use client";

import { useId, type ButtonHTMLAttributes, type MouseEvent } from "react";
import { useAdminAccess } from "@/lib/adminAccess/client";
import type { AdminAction } from "@/lib/adminAccess/actions";

export const ADMINS_ONLY_TOOLTIP = "Admins only";

type AdminActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** The ACL action this button performs. Decides whether the viewer may use it. */
  action: AdminAction;
  /** Classes for the tooltip wrapper shown when the action is locked (e.g. "tooltip-left"). */
  tooltipClassName?: string;
};

function LockIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-3.5 w-3.5 shrink-0"
      aria-hidden="true"
      data-testid="admin-action-lock"
    >
      <path
        fillRule="evenodd"
        d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/**
 * A button for an admin-only (or otherwise role-gated) operation.
 *
 * When the viewer's role allows `action` it renders a normal <button>. When it
 * does not, the button stays in the tab order but is aria-disabled, shows a
 * lock icon and an "Admins only" tooltip (on hover and keyboard focus), and
 * ignores clicks. The server still enforces the same ACL; this is only UI.
 */
export default function AdminActionButton({
  action,
  tooltipClassName = "",
  className = "",
  children,
  onClick,
  disabled,
  title,
  type = "button",
  ...rest
}: AdminActionButtonProps) {
  const { can } = useAdminAccess();
  const reasonId = useId();

  if (can(action)) {
    return (
      <button
        type={type}
        className={className}
        onClick={onClick}
        disabled={disabled}
        title={title}
        {...rest}
      >
        {children}
      </button>
    );
  }

  const block = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <span className={`tooltip ${tooltipClassName}`} data-tip={ADMINS_ONLY_TOOLTIP}>
      <button
        {...rest}
        type="button"
        className={`${className} btn-disabled cursor-not-allowed gap-1`}
        aria-disabled="true"
        aria-describedby={reasonId}
        data-locked="true"
        onClick={block}
      >
        <LockIcon />
        {children}
      </button>
      <span id={reasonId} className="sr-only">
        {ADMINS_ONLY_TOOLTIP}
      </span>
    </span>
  );
}
