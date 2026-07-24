"use client";

import { useState } from "react";
import { ADMIN_TOKEN_KEY } from "@/components/admin/AdminAuthGate";
import {
  BROADCAST_GROUPS,
  BROADCAST_GROUP_LABELS,
  type BroadcastGroup,
} from "@/lib/admin-broadcast/groups";

type SendResult = {
  name: string;
  email: string;
  ok: boolean;
  error?: string;
};

type SendResponse = {
  broadcastId: string;
  group: BroadcastGroup;
  results: SendResult[];
  sent: number;
  failed: number;
};

function adminHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem(ADMIN_TOKEN_KEY) : null;
  return {
    "Content-Type": "application/json",
    "x-admin-token": token ?? "",
  };
}

const MAX_SUBJECT = 200;
const MAX_MESSAGE = 20000;

export function BroadcastClient() {
  const [group, setGroup] = useState<BroadcastGroup>("mentors");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendResponse | null>(null);
  const [error, setError] = useState("");

  const canSend =
    subject.trim() !== "" &&
    subject.length <= MAX_SUBJECT &&
    message.trim() !== "" &&
    message.length <= MAX_MESSAGE &&
    !sending;

  const handleSend = async () => {
    setSending(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify({ group, subject, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? `Failed to send (${res.status})`);
        return;
      }
      setResult(data as SendResponse);
      // Clear the composer on success so the same message isn't re-sent by mistake.
      setSubject("");
      setMessage("");
    } catch {
      setError("Network error while sending the broadcast.");
    } finally {
      setSending(false);
      setShowConfirm(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold">Direct Message Broadcast</h1>
        <p className="text-base-content/60 mt-1 text-sm">
          Compose a message and email it to one audience. Delivery is via email only for now.
        </p>
      </div>

      {/* Recipient group */}
      <div className="form-control">
        <label className="label" htmlFor="broadcast-group">
          <span className="label-text font-semibold">Recipient group</span>
        </label>
        <select
          id="broadcast-group"
          className="select select-bordered"
          value={group}
          onChange={(e) => setGroup(e.target.value as BroadcastGroup)}
          disabled={sending}
        >
          {BROADCAST_GROUPS.map((g) => (
            <option key={g} value={g}>
              {BROADCAST_GROUP_LABELS[g]}
            </option>
          ))}
        </select>
      </div>

      {/* Subject */}
      <div className="form-control">
        <label className="label" htmlFor="broadcast-subject">
          <span className="label-text font-semibold">Subject</span>
          <span className="label-text-alt text-base-content/50">
            {subject.length}/{MAX_SUBJECT}
          </span>
        </label>
        <input
          id="broadcast-subject"
          type="text"
          className="input input-bordered"
          value={subject}
          maxLength={MAX_SUBJECT}
          placeholder="Subject line"
          onChange={(e) => setSubject(e.target.value)}
          disabled={sending}
        />
      </div>

      {/* Message */}
      <div className="form-control">
        <label className="label" htmlFor="broadcast-message">
          <span className="label-text font-semibold">Message</span>
          <span className="label-text-alt text-base-content/50">
            {message.length}/{MAX_MESSAGE}
          </span>
        </label>
        <textarea
          id="broadcast-message"
          className="textarea textarea-bordered min-h-40"
          value={message}
          maxLength={MAX_MESSAGE}
          placeholder="Write your message. Line breaks are preserved."
          onChange={(e) => setMessage(e.target.value)}
          disabled={sending}
        />
      </div>

      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className={`alert ${result.failed === 0 ? "alert-success" : "alert-warning"}`}>
          <div>
            <p className="font-semibold">
              Broadcast to {BROADCAST_GROUP_LABELS[result.group]} complete.
            </p>
            <p className="text-sm">
              {result.sent} sent
              {result.failed > 0 ? `, ${result.failed} failed` : ""}.
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button
          className="btn btn-primary"
          onClick={() => setShowConfirm(true)}
          disabled={!canSend}
        >
          Review &amp; Send
        </button>
      </div>

      {/* Confirm dialog */}
      {showConfirm && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Send this broadcast?</h3>
            <p className="py-2 text-sm">
              This will email <strong>all {BROADCAST_GROUP_LABELS[group]}</strong> with the subject
              &ldquo;{subject.trim()}&rdquo;. This cannot be undone.
            </p>
            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => setShowConfirm(false)}
                disabled={sending}
              >
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSend} disabled={sending}>
                {sending ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Sending…
                  </>
                ) : (
                  "Yes, send"
                )}
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setShowConfirm(false)}>close</button>
          </form>
        </dialog>
      )}
    </div>
  );
}
