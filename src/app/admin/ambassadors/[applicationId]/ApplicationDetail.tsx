"use client";
import { useCallback, useEffect, useState } from "react";
import { ADMIN_TOKEN_KEY } from "@/components/admin/AdminAuthGate";
import type { ApplicationDoc } from "@/types/ambassador";
import VideoEmbed from "./VideoEmbed";
import DiscordBanner from "./DiscordBanner";
import DecisionDialog from "./DecisionDialog";

type AppRow = ApplicationDoc & { applicationId: string };

function fmtDate(ts: unknown): string {
  if (!ts) return "";
  if (
    typeof ts === "object" &&
    ts !== null &&
    "_seconds" in (ts as Record<string, unknown>)
  ) {
    return new Date(
      (ts as { _seconds: number })._seconds * 1000
    ).toLocaleString();
  }
  if (typeof ts === "string") return new Date(ts).toLocaleString();
  return "";
}

export default function ApplicationDetail({
  applicationId,
}: {
  applicationId: string;
}) {
  const [app, setApp] = useState<AppRow | null>(null);
  const [studentIdUrl, setStudentIdUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"accept" | "decline" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem(ADMIN_TOKEN_KEY)
          : null;
      const res = await fetch(
        `/api/ambassador/applications/${applicationId}`,
        {
          headers: token ? { "x-admin-token": token } : {},
        }
      );
      if (!res.ok) {
        setError(`HTTP ${res.status}`);
        return;
      }
      const body = await res.json();
      setApp(body.application);
      setStudentIdUrl(body.studentIdSignedUrl);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <div className="loading loading-spinner" />;
  if (error || !app)
    return (
      <div className="alert alert-error">{error ?? "Not found"}</div>
    );

  // REVIEW-05: show Discord banner when accepted AND Discord isn't cleanly resolved.
  const showDiscordBanner =
    app.status === "accepted" &&
    (app.discordMemberId == null ||
      app.discordRetryNeeded === true ||
      app.discordRoleAssigned !== true);

  return (
    <article className="space-y-6">
      {/* Header: name + status + decision buttons */}
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{app.applicantName}</h1>
          <p className="opacity-70 text-sm">{app.applicantEmail}</p>
          <p className="opacity-70 text-sm">
            Submitted {fmtDate(app.submittedAt)}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <span
            className={`badge ${
              app.status === "accepted"
                ? "badge-success"
                : app.status === "declined"
                ? "badge-error"
                : "badge-info"
            }`}
          >
            {app.status}
          </span>
          {/* D-11: Accept / Decline buttons only visible when status is not yet final */}
          {app.status !== "accepted" && app.status !== "declined" && (
            <>
              <button
                className="btn btn-success btn-sm"
                onClick={() => setDialog("accept")}
              >
                Accept
              </button>
              <button
                className="btn btn-error btn-sm"
                onClick={() => setDialog("decline")}
              >
                Decline
              </button>
            </>
          )}
        </div>
      </header>

      {/* REVIEW-05 Discord banner (accepted + Discord unresolved) */}
      {showDiscordBanner && (
        <DiscordBanner
          applicationId={app.applicationId}
          discordHandle={app.discordHandle}
          discordMemberId={app.discordMemberId}
          onResolved={load}
        />
      )}

      {/* Basic applicant info */}
      <section className="card bg-base-200">
        <div className="card-body p-4">
          <h2 className="font-semibold">Applicant Details</h2>
          <dl className="grid grid-cols-[min-content_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="font-semibold whitespace-nowrap">University</dt>
            <dd>{app.university}</dd>
            <dt className="font-semibold whitespace-nowrap">Year</dt>
            <dd>{app.yearOfStudy}</dd>
            <dt className="font-semibold whitespace-nowrap">Location</dt>
            <dd>
              {app.city}, {app.country}
            </dd>
            <dt className="font-semibold whitespace-nowrap">Discord</dt>
            <dd>
              {app.discordHandle}
              {app.discordMemberId
                ? ` (${app.discordMemberId})`
                : " (unresolved)"}
            </dd>
            <dt className="font-semibold whitespace-nowrap">Academic</dt>
            <dd>
              {app.academicEmail ? (
                <>
                  {app.academicEmail}{" "}
                  <span
                    className={`badge badge-sm ${
                      app.academicEmailVerified
                        ? "badge-success"
                        : "badge-warning"
                    }`}
                  >
                    {app.academicEmailVerified
                      ? "auto-verified"
                      : "needs manual review"}
                  </span>
                </>
              ) : app.studentIdStoragePath ? (
                <>
                  Student ID uploaded{" "}
                  {studentIdUrl ? (
                    <a
                      href={studentIdUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link link-primary"
                    >
                      View photo (signed, expires in 1 hour)
                    </a>
                  ) : (
                    <span className="opacity-60">
                      (signed URL unavailable)
                    </span>
                  )}
                </>
              ) : (
                "—"
              )}
            </dd>
          </dl>
        </div>
      </section>

      {/* Prompt responses */}
      {(["motivation", "experience", "pitch"] as const).map((k, i) => (
        <section key={k} className="card bg-base-100 border border-base-300">
          <div className="card-body p-4">
            <h2 className="font-semibold">
              Prompt {i + 1}: {k}
            </h2>
            <p className="whitespace-pre-wrap text-sm">{app[k]}</p>
          </div>
        </section>
      ))}

      {/* Video embed (D-08) */}
      <section className="card bg-base-100 border border-base-300">
        <div className="card-body p-4">
          <h2 className="font-semibold mb-2">Application Video</h2>
          <VideoEmbed
            videoUrl={app.videoUrl}
            videoEmbedType={app.videoEmbedType}
          />
          <p className="text-xs opacity-60 mt-2 break-all">
            <a
              href={app.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="link"
            >
              {app.videoUrl}
            </a>
          </p>
        </div>
      </section>

      {/* Reviewer notes (if present — only shows after a decision is made) */}
      {app.reviewerNotes && (
        <section className="card bg-base-200">
          <div className="card-body p-4">
            <h2 className="font-semibold">Reviewer notes</h2>
            <p className="whitespace-pre-wrap text-sm">{app.reviewerNotes}</p>
          </div>
        </section>
      )}

      {/* Decision dialog (REVIEW-03) */}
      {dialog && (
        <DecisionDialog
          applicationId={app.applicationId}
          action={dialog}
          onClose={() => setDialog(null)}
          onDone={() => {
            setDialog(null);
            load();
          }}
        />
      )}
    </article>
  );
}
