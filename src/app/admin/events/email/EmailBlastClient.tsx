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

// ── Step badge ─────────────────────────────────────────────────────────────

function StepBadge({ n, done }: { n: number; done?: boolean }) {
  return (
    <span
      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0 ${
        done
          ? "bg-success text-success-content"
          : "bg-primary text-primary-content"
      }`}
    >
      {done ? "✓" : n}
    </span>
  );
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

  // Track whether user manually edited subject
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
      if (draft) setSubject(draft.title);
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
      <div className="p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold">Blast Results</h1>
            <p className="text-base-content/60 text-sm mt-1">
              Email delivery summary
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="card bg-success/10 border border-success/30">
              <div className="card-body py-4 px-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-success/80">
                  Delivered
                </p>
                <p className="text-4xl font-bold text-success">{sent}</p>
              </div>
            </div>
            <div className={`card border ${failed > 0 ? "bg-error/10 border-error/30" : "bg-base-200 border-base-300"}`}>
              <div className="card-body py-4 px-5">
                <p className={`text-xs font-semibold uppercase tracking-wider ${failed > 0 ? "text-error/80" : "text-base-content/40"}`}>
                  Failed
                </p>
                <p className={`text-4xl font-bold ${failed > 0 ? "text-error" : "text-base-content/30"}`}>
                  {failed}
                </p>
              </div>
            </div>
          </div>

          {/* Results table */}
          <div className="card bg-base-100 shadow-md">
            <div className="card-body p-0">
              <div className="overflow-x-auto rounded-box">
                <table className="table table-sm w-full">
                  <thead>
                    <tr className="text-xs uppercase tracking-wider text-base-content/50">
                      <th className="w-10"></th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r, i) => (
                      <tr key={i} className="hover">
                        <td>
                          <span
                            className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${
                              r.ok
                                ? "bg-success/20 text-success"
                                : "bg-error/20 text-error"
                            }`}
                          >
                            {r.ok ? "✓" : "✗"}
                          </span>
                        </td>
                        <td className="font-medium">{r.name}</td>
                        <td className="font-mono text-sm text-base-content/70">
                          {r.email}
                        </td>
                        <td className="text-sm text-base-content/50">
                          {r.error ?? ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button className="btn btn-primary" onClick={handleReset}>
              Send another blast
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Composer view ─────────────────────────────────────────────────────────

  return (
    <div className="p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold">Email Blast Composer</h1>
          <p className="text-base-content/60 text-sm mt-1">
            Pick a Ghost draft, paste recipients, send.
          </p>
        </div>

        {/* Global errors */}
        {sendError && (
          <div role="alert" className="alert alert-error text-sm py-2.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            {sendError}
          </div>
        )}

        {/* ── Step 1: Compose ────────────────────────────────────────────── */}
        <div className="card bg-base-100 shadow-md">
          <div className="card-body gap-5">
            <div className="flex items-center gap-2.5">
              <StepBadge n={1} done={!!selectedDraftId && subject.trim().length > 0} />
              <h2 className="font-bold text-base">Compose</h2>
            </div>

            <div className="divider my-0" />

            {/* Draft picker */}
            <div className="form-control">
              <label className="label pb-1" htmlFor="draft-select">
                <span className="label-text font-semibold text-sm">Ghost Draft</span>
                <button
                  type="button"
                  className="btn btn-xs btn-ghost gap-1.5"
                  onClick={fetchDrafts}
                  disabled={draftsLoading}
                  aria-label="Refresh drafts"
                >
                  {draftsLoading ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )}
                  Refresh
                </button>
              </label>

              {draftsError && (
                <div role="alert" className="alert alert-warning text-xs py-2 mb-2">
                  {draftsError}
                </div>
              )}

              <select
                id="draft-select"
                className="select select-bordered w-full"
                value={selectedDraftId}
                onChange={(e) => handleDraftChange(e.target.value)}
                disabled={sending}
              >
                <option value="">
                  {draftsLoading
                    ? "Loading…"
                    : drafts.length === 0
                    ? "No drafts found — tag a Ghost page with #email-blast"
                    : "Select a draft…"}
                </option>
                {drafts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                    {d.updatedAt ? `  ·  updated ${relativeTime(d.updatedAt)}` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject */}
            <div className="form-control">
              <label className="label pb-1" htmlFor="subject-input">
                <span className="label-text font-semibold text-sm">Subject line</span>
                {selectedDraftId && !subjectTouchedRef.current && (
                  <span className="label-text-alt text-base-content/40">
                    auto-filled from draft title
                  </span>
                )}
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
          </div>
        </div>

        {/* ── Step 2: Recipients ─────────────────────────────────────────── */}
        <div className="card bg-base-100 shadow-md">
          <div className="card-body gap-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <StepBadge n={2} done={recipientCount > 0} />
                <h2 className="font-bold text-base">Recipients</h2>
              </div>

              {/* Recipient count badge */}
              {parseResult && (
                <div className="flex items-center gap-2" aria-live="polite">
                  {recipientCount > 0 && (
                    <span className="badge badge-success badge-sm gap-1 font-semibold">
                      {recipientCount} recipient{recipientCount !== 1 ? "s" : ""}
                    </span>
                  )}
                  {dupCount > 0 && (
                    <span className="badge badge-ghost badge-sm text-base-content/50">
                      {dupCount} dup{dupCount !== 1 ? "s" : ""} removed
                    </span>
                  )}
                  {skippedCount > 0 && (
                    <span className="badge badge-warning badge-sm">
                      {skippedCount} skipped
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="divider my-0" />

            <div className="form-control">
              <label className="label pb-1" htmlFor="recipients-textarea">
                <span className="label-text font-semibold text-sm">Paste from Google Sheets</span>
                <span className="label-text-alt text-base-content/40">TSV or CSV, with header row</span>
              </label>
              <textarea
                id="recipients-textarea"
                className="textarea textarea-bordered font-mono text-sm leading-relaxed"
                rows={8}
                placeholder={"Full Name\tEmail\nJohn Doe\tjohn@example.com\nJane Smith\tjane@example.com"}
                value={recipientsRaw}
                onChange={(e) => handleRecipientsChange(e.target.value)}
                disabled={sending}
              />
            </div>

            {/* Skipped rows detail */}
            {skippedCount > 0 && parseResult && (
              <details className="bg-warning/10 rounded-lg px-3 py-2">
                <summary className="cursor-pointer text-xs font-semibold text-warning select-none">
                  {skippedCount} row{skippedCount !== 1 ? "s" : ""} skipped — show details
                </summary>
                <ul className="mt-2 text-xs font-mono text-base-content/60 space-y-1 max-h-32 overflow-y-auto">
                  {parseResult.skipped.map((s) => (
                    <li key={s.line} className="flex gap-2">
                      <span className="text-warning/70 shrink-0">L{s.line}</span>
                      <span className="text-base-content/50 shrink-0">{s.reason}</span>
                      <span className="truncate">{s.raw.slice(0, 60)}{s.raw.length > 60 ? "…" : ""}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        </div>

        {/* ── Step 3: Preview + Send ─────────────────────────────────────── */}
        <div className="card bg-base-100 shadow-md">
          <div className="card-body gap-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2.5">
                <StepBadge n={3} />
                <h2 className="font-bold text-base">Preview &amp; Send</h2>
                {selectedDraft && (
                  <span className="badge badge-ghost badge-sm font-normal text-base-content/50">
                    {"{{"+"name"+"}}"} substituted
                  </span>
                )}
              </div>

              <button
                type="button"
                className="btn btn-primary btn-sm gap-2"
                disabled={!canSend}
                aria-busy={sending}
                onClick={() => setShowConfirm(true)}
              >
                {sending ? (
                  <>
                    <span className="loading loading-spinner loading-xs" />
                    Sending…
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Send to {recipientCount || "…"} recipient{recipientCount !== 1 ? "s" : ""}
                  </>
                )}
              </button>
            </div>

            <div className="divider my-0" />

            {selectedDraft ? (
              <PreviewIframe html={previewHtml} />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-base-content/30 gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <p className="text-sm">Select a draft to see the preview</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Confirm modal ───────────────────────────────────────────────── */}
      {showConfirm && parseResult && (
        <dialog
          className="modal modal-open"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
          onKeyDown={(e) => {
            if (e.key === "Escape") setShowConfirm(false);
          }}
        >
          <div className="modal-box max-w-md">
            {/* Modal header */}
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 id="confirm-modal-title" className="font-bold text-lg">
                  Ready to send?
                </h3>
                <p className="text-sm text-base-content/50 mt-0.5">
                  This cannot be undone.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-circle btn-ghost"
                onClick={() => setShowConfirm(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Summary */}
            <div className="bg-base-200 rounded-lg p-4 space-y-2 text-sm mb-4">
              <div className="flex gap-3">
                <span className="text-base-content/50 w-24 shrink-0">Subject</span>
                <span className="font-medium break-words">{subject.trim()}</span>
              </div>
              <div className="flex gap-3">
                <span className="text-base-content/50 w-24 shrink-0">Recipients</span>
                <span className="font-bold text-primary">{recipientCount}</span>
              </div>
            </div>

            {/* Preview recipients */}
            <p className="text-xs font-semibold uppercase tracking-wider text-base-content/40 mb-2">
              First {Math.min(5, parseResult.recipients.length)} recipients
            </p>
            <ul className="space-y-1.5 mb-2">
              {parseResult.recipients.slice(0, 5).map((r, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                    {r.name[0]?.toUpperCase() ?? "?"}
                  </span>
                  <span className="font-medium">{r.name}</span>
                  <span className="text-base-content/50 font-mono text-xs truncate">
                    {r.email}
                  </span>
                </li>
              ))}
            </ul>

            {parseResult.recipients.length > 5 && (
              <details className="mb-4">
                <summary className="cursor-pointer text-xs text-base-content/40 select-none">
                  +{parseResult.recipients.length - 5} more recipients
                </summary>
                <ul className="mt-2 text-xs font-mono space-y-1 max-h-36 overflow-y-auto text-base-content/60 pl-1">
                  {parseResult.recipients.slice(5).map((r, i) => (
                    <li key={i}>
                      {r.name} &lt;{r.email}&gt;
                    </li>
                  ))}
                </ul>
              </details>
            )}

            <div className="modal-action gap-2 mt-5">
              <button
                type="button"
                className="btn btn-ghost flex-1"
                onClick={() => setShowConfirm(false)}
                autoFocus
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary flex-1 gap-2"
                onClick={handleSendConfirm}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Send {recipientCount} emails
              </button>
            </div>
          </div>
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
