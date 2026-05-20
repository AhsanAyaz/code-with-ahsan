"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ADMIN_TOKEN_KEY } from "@/components/admin/AdminAuthGate";
import {
  parseRecipients,
  type ParseResult,
} from "@/lib/email-blast/parseRecipients";
import { PreviewIframe } from "./PreviewIframe";

// ── Types ──────────────────────────────────────────────────────────────────

type Draft = {
  id: string;
  title: string;
  html: string;
  updatedAt: string;
};

type SendResult = {
  name: string;
  email: string;
  ok: boolean;
  error?: string;
};

// ── Helpers ────────────────────────────────────────────────────────────────

function adminHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem(ADMIN_TOKEN_KEY)
      : null;
  return { "x-admin-token": token ?? "" };
}

function relativeTime(isoString: string): string {
  try {
    const diff = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  } catch {
    return "";
  }
}

// ── Component ──────────────────────────────────────────────────────────────

export function EmailBlastClient() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [draftsError, setDraftsError] = useState("");
  const [selectedDraftId, setSelectedDraftId] = useState<string>("");
  const [subject, setSubject] = useState<string>("");
  const [recipientsRaw, setRecipientsRaw] = useState<string>("");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<SendResult[] | null>(null);
  const [sendError, setSendError] = useState("");

  // Track whether user manually edited subject — prevents draft selection
  // from overwriting deliberate user input (same pattern as raffle titleHydratedRef)
  const subjectTouchedRef = useRef(false);

  // Debounce timer for recipient parsing
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Draft fetch ───────────────────────────────────────────────────────────

  const fetchDrafts = useCallback(async () => {
    setDraftsLoading(true);
    setDraftsError("");
    try {
      const res = await fetch("/api/admin/email-blast/drafts", {
        headers: adminHeaders(),
      });
      if (res.status === 404 || res.status === 204) {
        setDrafts([]);
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setDraftsError(data.error ?? `Failed to load drafts (${res.status})`);
        return;
      }
      const data = await res.json();
      setDrafts(data.drafts ?? []);
    } catch {
      setDraftsError("Network error loading drafts.");
    } finally {
      setDraftsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDrafts();
  }, [fetchDrafts]);

  // ── Draft selection ───────────────────────────────────────────────────────

  function handleDraftChange(id: string) {
    setSelectedDraftId(id);
    if (!subjectTouchedRef.current && id) {
      const draft = drafts.find((d) => d.id === id);
      if (draft) {
        setSubject(draft.title);
      }
    }
  }

  // ── Recipient parsing (debounced) ─────────────────────────────────────────

  function handleRecipientsChange(value: string) {
    setRecipientsRaw(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setParseResult(parseRecipients(value));
    }, 150);
  }

  // Initial parse on unmount cleanup
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // ── Send flow ─────────────────────────────────────────────────────────────

  async function handleSendConfirm() {
    if (!parseResult) return;
    setSending(true);
    setSendError("");
    setShowConfirm(false);

    try {
      const res = await fetch("/api/admin/email-blast", {
        method: "POST",
        headers: {
          ...adminHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ghostPostId: selectedDraftId,
          subject: subject.trim(),
          recipients: parseResult.recipients,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setSendError(data.error ?? `Send failed (${res.status})`);
        return;
      }

      setResults(data.results ?? []);
    } catch {
      setSendError("Network error. Please try again.");
    } finally {
      setSending(false);
    }
  }

  function handleReset() {
    setSelectedDraftId("");
    setSubject("");
    subjectTouchedRef.current = false;
    setRecipientsRaw("");
    setParseResult(null);
    setResults(null);
    setSendError("");
  }

  // ── Derived values ────────────────────────────────────────────────────────

  const selectedDraft = drafts.find((d) => d.id === selectedDraftId) ?? null;

  // Substitute {{name}} with first recipient's name for preview
  const previewHtml = selectedDraft
    ? selectedDraft.html.replace(
        /\{\{name\}\}/g,
        parseResult?.recipients[0]?.name ?? "[Recipient Name]"
      )
    : "";

  const recipientCount = parseResult?.recipients.length ?? 0;
  const dupCount = parseResult?.duplicatesRemoved ?? 0;
  const skippedCount = parseResult?.skipped.length ?? 0;

  const canSend =
    !!selectedDraftId &&
    subject.trim().length > 0 &&
    recipientCount >= 1 &&
    !sending;

  // ── Results view ──────────────────────────────────────────────────────────

  if (results !== null) {
    const sent = results.filter((r) => r.ok).length;
    const failed = results.filter((r) => !r.ok).length;
    return (
      <div className="min-h-screen bg-base-200 p-6">
        <div className="max-w-3xl mx-auto">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body gap-6">
              <h1 className="card-title text-2xl font-bold">Blast Results</h1>

              {/* Summary stats */}
              <div className="stats bg-base-200 shadow-sm w-full">
                <div className="stat">
                  <div className="stat-title">Sent</div>
                  <div className="stat-value text-success">{sent}</div>
                </div>
                <div className="stat">
                  <div className="stat-title">Failed</div>
                  <div className="stat-value text-error">{failed}</div>
                </div>
              </div>

              {/* Results table */}
              <div className="overflow-x-auto">
                <table className="table table-sm w-full">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r, i) => (
                      <tr
                        key={i}
                        className={r.ok ? "text-success" : "text-error"}
                      >
                        <td className="font-mono font-bold">
                          {r.ok ? "✓" : "✗"}
                        </td>
                        <td>{r.name}</td>
                        <td>{r.email}</td>
                        <td className="text-sm opacity-80">{r.error ?? ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Actions */}
              <div className="flex gap-3 flex-wrap">
                <button className="btn btn-primary" onClick={handleReset}>
                  Start new blast
                </button>
                <a
                  href="/admin/events/email/history"
                  className="btn btn-ghost btn-sm self-center"
                >
                  View audit log
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Composer view ─────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-base-200 p-6">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body gap-6">
            <h1 className="card-title text-2xl font-bold">
              Email Blast Composer
            </h1>

            {/* Error alerts */}
            {draftsError && (
              <div role="alert" className="alert alert-error text-sm py-2">
                {draftsError}
              </div>
            )}
            {sendError && (
              <div role="alert" className="alert alert-error text-sm py-2">
                {sendError}
              </div>
            )}

            {/* Draft picker */}
            <div className="form-control">
              <label className="label" htmlFor="draft-select">
                <span className="label-text font-semibold">Ghost Draft</span>
                <button
                  type="button"
                  className="btn btn-xs btn-ghost"
                  onClick={fetchDrafts}
                  disabled={draftsLoading}
                  aria-label="Refresh drafts"
                >
                  {draftsLoading ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : (
                    "Refresh"
                  )}
                </button>
              </label>
              <select
                id="draft-select"
                className="select select-bordered w-full"
                value={selectedDraftId}
                onChange={(e) => handleDraftChange(e.target.value)}
                disabled={sending}
              >
                <option value="">
                  {draftsLoading
                    ? "Loading drafts..."
                    : drafts.length === 0
                    ? "No drafts found"
                    : "Select a draft"}
                </option>
                {drafts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                    {d.updatedAt ? ` (updated ${relativeTime(d.updatedAt)})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject input */}
            <div className="form-control">
              <label className="label" htmlFor="subject-input">
                <span className="label-text font-semibold">Subject</span>
              </label>
              <input
                id="subject-input"
                type="text"
                className="input input-bordered w-full"
                placeholder="Email subject line"
                value={subject}
                onChange={(e) => {
                  subjectTouchedRef.current = true;
                  setSubject(e.target.value);
                }}
                disabled={sending}
                maxLength={200}
              />
            </div>

            {/* Recipient textarea */}
            <div className="form-control">
              <label className="label" htmlFor="recipients-textarea">
                <span className="label-text font-semibold">Recipients</span>
                <span className="label-text-alt opacity-80">
                  Paste TSV or CSV from Google Sheets
                </span>
              </label>
              <textarea
                id="recipients-textarea"
                className="textarea textarea-bordered font-mono text-sm"
                rows={8}
                placeholder={"name\temail\nJohn Doe\tjohn@example.com\n..."}
                value={recipientsRaw}
                onChange={(e) => handleRecipientsChange(e.target.value)}
                disabled={sending}
              />

              {/* Live count */}
              {parseResult && (
                <div
                  className="label flex-col items-start gap-1"
                  aria-live="polite"
                >
                  <span
                    className={`label-text-alt ${
                      skippedCount > 0 ? "text-warning" : "text-success"
                    }`}
                  >
                    {recipientCount} recipient{recipientCount !== 1 ? "s" : ""}
                    {dupCount > 0 && ` · ${dupCount} duplicate${dupCount !== 1 ? "s" : ""} removed`}
                    {skippedCount > 0 && ` · ${skippedCount} skipped`}
                  </span>

                  {/* Collapsible skipped rows */}
                  {skippedCount > 0 && (
                    <details className="w-full mt-1">
                      <summary className="cursor-pointer text-xs text-warning opacity-90">
                        Show skipped rows
                      </summary>
                      <ul className="mt-1 text-xs font-mono text-base-content/70 space-y-0.5 max-h-32 overflow-y-auto">
                        {parseResult.skipped.map((s) => (
                          <li key={s.line}>
                            Line {s.line}: {s.reason} — <span className="opacity-70">{s.raw.slice(0, 60)}{s.raw.length > 60 ? "…" : ""}</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              )}
            </div>

            {/* Send button */}
            <div className="card-actions justify-end">
              <button
                type="button"
                className="btn btn-primary"
                disabled={!canSend}
                aria-busy={sending}
                onClick={() => setShowConfirm(true)}
              >
                {sending ? (
                  <>
                    <span className="loading loading-spinner loading-sm" />
                    Sending...
                  </>
                ) : (
                  `Send to ${recipientCount} recipient${recipientCount !== 1 ? "s" : ""}`
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Preview panel */}
        {selectedDraft && (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body gap-4">
              <h2 className="card-title text-lg font-semibold">
                Preview
                <span className="badge badge-ghost badge-sm font-normal">
                  {"{{"+"name"+"}}"} substituted
                </span>
              </h2>
              <PreviewIframe html={previewHtml} />
            </div>
          </div>
        )}
      </div>

      {/* Confirm modal */}
      {showConfirm && parseResult && (
        <dialog
          className="modal modal-open"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
          onKeyDown={(e) => {
            if (e.key === "Escape") setShowConfirm(false);
          }}
        >
          <div className="modal-box max-w-lg">
            <h3 id="confirm-modal-title" className="font-bold text-lg mb-4">
              Confirm Email Blast
            </h3>

            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm mb-4">
              <dt className="font-semibold text-base-content/70">Subject</dt>
              <dd className="break-words">{subject.trim()}</dd>
              <dt className="font-semibold text-base-content/70">Recipients</dt>
              <dd>{recipientCount}</dd>
            </dl>

            {/* First 5 recipients */}
            <ul className="text-sm space-y-1 mb-2">
              {parseResult.recipients.slice(0, 5).map((r, i) => (
                <li key={i} className="flex gap-2">
                  <span className="font-medium">{r.name}</span>
                  <span className="text-base-content/70">&lt;{r.email}&gt;</span>
                </li>
              ))}
            </ul>

            {/* Full list in collapsible */}
            {parseResult.recipients.length > 5 && (
              <details className="mb-4">
                <summary className="cursor-pointer text-xs text-base-content/70">
                  +{parseResult.recipients.length - 5} more
                </summary>
                <ul className="mt-1 text-xs font-mono space-y-0.5 max-h-40 overflow-y-auto text-base-content/70">
                  {parseResult.recipients.slice(5).map((r, i) => (
                    <li key={i}>
                      {r.name} &lt;{r.email}&gt;
                    </li>
                  ))}
                </ul>
              </details>
            )}

            <div className="modal-action mt-4">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowConfirm(false)}
                autoFocus
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSendConfirm}
              >
                Send now
              </button>
            </div>
          </div>
          {/* Backdrop closes modal */}
          <form method="dialog" className="modal-backdrop">
            <button type="button" onClick={() => setShowConfirm(false)}>
              close
            </button>
          </form>
        </dialog>
      )}
    </div>
  );
}
