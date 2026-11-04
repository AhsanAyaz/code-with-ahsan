"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { adminFetch, adminErrorMessage } from "@/lib/adminAccess/client";
import { actionLabel, actionOptionsByDomain, targetHref } from "@/lib/adminAccess/labels";
import RoleBadge from "@/components/admin/RoleBadge";

interface ActivityEntry {
  id: string;
  actorUid: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  target: { type: string; id: string; label?: string } | null;
  meta: Record<string, unknown> | null;
  createdAt: string | null;
}

interface TeamOption {
  uid: string;
  email: string;
}

const PAGE_SIZE = 25;

function metaSummary(entry: ActivityEntry): string | null {
  const meta = entry.meta;
  if (!meta) return null;
  if (entry.action === "staff.manage") {
    const prev = typeof meta.previousRole === "string" ? meta.previousRole : null;
    const next = typeof meta.role === "string" ? meta.role : null;
    if (!next) return prev ? `Removed (was ${prev})` : "Removed";
    return prev ? `Now ${next} (was ${prev})` : `Added as ${next}`;
  }
  return null;
}

function formatMetaValue(value: unknown): string {
  if (value === null || value === undefined) return "none";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

function Target({ target }: { target: ActivityEntry["target"] }) {
  if (!target) return null;
  const text = target.label || target.id;
  const href = targetHref(target);
  return href ? (
    <Link href={href} className="link link-hover truncate">
      {text}
    </Link>
  ) : (
    <span className="truncate">{text}</span>
  );
}

function EntryRow({ entry }: { entry: ActivityEntry }) {
  const when = entry.createdAt ? new Date(entry.createdAt) : null;
  const summary = metaSummary(entry);
  const metaEntries = entry.meta && !summary ? Object.entries(entry.meta) : [];

  return (
    <li className="grid gap-1 px-4 py-3 sm:grid-cols-[1fr_auto] sm:gap-4">
      <div className="min-w-0 space-y-1">
        <p className="font-medium">{actionLabel(entry.action)}</p>
        <p className="flex flex-wrap items-center gap-x-2 text-sm text-base-content/70">
          {entry.target && <Target target={entry.target} />}
          {summary && <span>{summary}</span>}
        </p>
        <p className="flex flex-wrap items-center gap-2 text-sm text-base-content/60">
          <span>{entry.actorEmail || entry.actorUid}</span>
          <RoleBadge role={entry.actorRole} />
        </p>
        {metaEntries.length > 0 && (
          <details className="text-sm text-base-content/60">
            <summary className="cursor-pointer select-none">Details</summary>
            <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
              {metaEntries.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="font-medium">{k}</dt>
                  <dd className="break-all">{formatMetaValue(v)}</dd>
                </div>
              ))}
            </dl>
          </details>
        )}
      </div>
      {when && (
        <time
          dateTime={entry.createdAt!}
          title={format(when, "d MMM yyyy, HH:mm")}
          className="text-sm text-base-content/60 whitespace-nowrap sm:text-right"
        >
          {formatDistanceToNow(when, { addSuffix: true })}
        </time>
      )}
    </li>
  );
}

export default function ActivityClient() {
  const [actor, setActor] = useState("");
  const [action, setAction] = useState("");
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [team, setTeam] = useState<TeamOption[]>([]);

  const actionGroups = useMemo(() => actionOptionsByDomain(), []);

  useEffect(() => {
    adminFetch("/api/admin/team")
      .then((res) => (res.ok ? res.json() : { members: [] }))
      .then((data: { members?: TeamOption[] }) => setTeam(data.members ?? []))
      .catch(() => setTeam([]));
  }, []);

  const fetchPage = useCallback(
    async (cursor: string | null) => {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
      if (actor) params.set("actor", actor);
      if (action) params.set("action", action);
      if (cursor) params.set("cursor", cursor);
      const res = await adminFetch(`/api/admin/activity?${params}`);
      if (!res.ok) {
        const fallback = "Could not load activity.";
        if (res.status === 403) throw new Error(await adminErrorMessage(res, fallback));
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || fallback);
      }
      return (await res.json()) as { entries: ActivityEntry[]; nextCursor: string | null };
    },
    [actor, action]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchPage(null)
      .then((data) => {
        if (cancelled) return;
        setEntries(data.entries);
        setNextCursor(data.nextCursor);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchPage]);

  const loadMore = async () => {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const data = await fetchPage(nextCursor);
      setEntries((prev) => [...prev, ...data.entries]);
      setNextCursor(data.nextCursor);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingMore(false);
    }
  };

  const filtered = Boolean(actor || action);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Activity</h1>
        <p className="text-base-content/70 mt-1">
          Every change made in the admin portal, newest first.
        </p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="form-control w-full sm:w-64">
          <span className="label-text mb-1">Person</span>
          <select
            className="select select-bordered select-sm w-full"
            value={actor}
            onChange={(e) => {
              setActor(e.target.value);
              if (e.target.value) setAction("");
            }}
          >
            <option value="">Everyone</option>
            {team.map((m) => (
              <option key={m.uid} value={m.uid}>
                {m.email}
              </option>
            ))}
          </select>
        </label>
        <label className="form-control w-full sm:w-72">
          <span className="label-text mb-1">Action</span>
          <select
            className="select select-bordered select-sm w-full"
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              if (e.target.value) setActor("");
            }}
          >
            <option value="">All actions</option>
            {actionGroups.map((group) => (
              <optgroup key={group.domain} label={group.domain}>
                {group.actions.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        {filtered && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setActor("");
              setAction("");
            }}
          >
            Clear filter
          </button>
        )}
      </div>
      <p className="text-xs text-base-content/60 -mt-3">
        Filter by one person or one action at a time.
      </p>

      {loading ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg" />
        </div>
      ) : error && entries.length === 0 ? (
        <div role="alert" className="alert alert-error">
          {error}
        </div>
      ) : entries.length === 0 ? (
        <p className="text-base-content/70 py-8">
          {filtered
            ? "Nothing matches this filter yet."
            : "No activity yet. Changes made in the portal show up here."}
        </p>
      ) : (
        <>
          <ul className="divide-y divide-base-300 rounded-box border border-base-300 bg-base-100">
            {entries.map((entry) => (
              <EntryRow key={entry.id} entry={entry} />
            ))}
          </ul>
          {error && (
            <div role="alert" className="alert alert-error alert-soft text-sm">
              {error}
            </div>
          )}
          {nextCursor && (
            <div className="flex justify-center">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore && <span className="loading loading-spinner loading-xs" />}
                Load more
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
