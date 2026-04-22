"use client";
import { useState } from "react";
import { ADMIN_TOKEN_KEY } from "@/components/admin/AdminAuthGate";

interface Props {
  applicationId: string;
  discordHandle: string;
  discordMemberId: string | null;
  onResolved: () => void;
}

export default function DiscordBanner({
  applicationId,
  discordHandle,
  discordMemberId,
  onResolved,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleRetry = async () => {
    setBusy(true);
    setResult(null);
    try {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem(ADMIN_TOKEN_KEY)
          : null;
      const res = await fetch(
        `/api/ambassador/applications/${applicationId}/discord-resolve`,
        {
          method: "POST",
          headers: token ? { "x-admin-token": token } : {},
        }
      );
      const body = await res.json();
      if (body.success) {
        setResult({ success: true, message: "Discord role assigned." });
      } else if (body.reason === "handle_not_found") {
        setResult({
          success: false,
          message:
            body.message ??
            "Discord handle not found in the server.",
        });
      } else {
        setResult({
          success: false,
          message: "Role assignment failed. Try again in a moment.",
        });
      }
      onResolved();
    } catch {
      setResult({ success: false, message: "Network error." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="alert alert-warning">
      <div className="flex-1">
        <h3 className="font-bold">Discord role pending</h3>
        <p className="text-sm">
          {discordMemberId
            ? `Could not assign the Ambassador Discord role to ${discordHandle} (${discordMemberId}).`
            : `Could not find Discord member "${discordHandle}" in the server.`}
        </p>
        {result && (
          <p
            className={`text-sm mt-1 ${
              result.success ? "text-success" : "text-error"
            }`}
          >
            {result.message}
          </p>
        )}
      </div>
      <button
        className="btn btn-sm btn-warning"
        onClick={handleRetry}
        disabled={busy}
      >
        {busy ? "Retrying…" : "Retry"}
      </button>
    </div>
  );
}
