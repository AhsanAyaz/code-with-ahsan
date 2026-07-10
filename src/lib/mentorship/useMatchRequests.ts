"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/contexts/ToastContext";

export type RequestStatus = "none" | "pending" | "declined" | "active" | "completed";

export interface PendingConflict {
  newMentorId: string;
  newMentorName?: string;
  pendingMatchId: string;
  pendingMentorName?: string;
}

/**
 * Shared client logic for the "Request Match" flow used by both the public
 * `/mentorship` landing page (Option A, GH#235) and the gated
 * `/mentorship/browse` page.
 *
 * Enforces the "one active request at a time" policy (GH#234): when the mentee
 * already has a pending request with a different mentor, the API responds 409
 * with `code: "pending_request_exists"`, which this hook surfaces as a
 * `conflict` so the caller can render a one-at-a-time withdrawal dialog.
 */
export function useMatchRequests(userId?: string, enabled = true) {
  const toast = useToast();
  const [statusMap, setStatusMap] = useState<Map<string, RequestStatus>>(new Map());
  const [pendingMatchIds, setPendingMatchIds] = useState<Map<string, string>>(new Map());
  const [sessionInfo, setSessionInfo] = useState<
    Map<string, { sessionId: string; hasRated: boolean }>
  >(new Map());
  const [requestingMentor, setRequestingMentor] = useState<string | null>(null);
  const [withdrawingMentor, setWithdrawingMentor] = useState<string | null>(null);
  const [conflict, setConflict] = useState<PendingConflict | null>(null);
  const [switching, setSwitching] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/mentorship/mentee-requests?menteeId=${userId}`);
      if (!res.ok) return;
      const data = await res.json();
      const sm = new Map<string, RequestStatus>();
      const pm = new Map<string, string>();
      const si = new Map<string, { sessionId: string; hasRated: boolean }>();
      for (const r of data.requests || []) {
        sm.set(r.mentorId, r.status as RequestStatus);
        if (r.status === "completed") {
          si.set(r.mentorId, {
            sessionId: r.sessionId || r.id,
            hasRated: r.hasRated || false,
          });
        }
        if (r.status === "pending") {
          pm.set(r.mentorId, r.sessionId || r.id);
        }
      }
      setStatusMap(sm);
      setPendingMatchIds(pm);
      setSessionInfo(si);
    } catch (error) {
      console.error("Error fetching mentee requests:", error);
    }
  }, [userId]);

  useEffect(() => {
    if (enabled && userId) refresh();
  }, [enabled, userId, refresh]);

  const postMatch = useCallback(
    (mentorId: string) =>
      fetch("/api/mentorship/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menteeId: userId, mentorId }),
      }),
    [userId]
  );

  const requestMatch = useCallback(
    async (mentorId: string, mentorName?: string) => {
      if (!userId) return;
      setRequestingMentor(mentorId);
      try {
        const res = await postMatch(mentorId);
        if (res.ok) {
          setStatusMap((prev) => new Map(prev).set(mentorId, "pending"));
          await refresh();
          return;
        }
        const err = await res.json();
        if (res.status === 409 && err.code === "pending_request_exists") {
          setConflict({
            newMentorId: mentorId,
            newMentorName: mentorName,
            pendingMatchId: err.pendingMatchId,
            pendingMentorName: err.pendingMentorName,
          });
          return;
        }
        if (res.status === 409 && err.status) {
          // Existing request with THIS mentor — sync the displayed status.
          setStatusMap((prev) => new Map(prev).set(mentorId, err.status as RequestStatus));
          return;
        }
        toast.error(`Failed to send request: ${err.error || err.message || ""}`);
      } catch (error) {
        console.error("Error requesting match:", error);
        toast.error("An error occurred. Please try again.");
      } finally {
        setRequestingMentor(null);
      }
    },
    [userId, postMatch, refresh, toast]
  );

  const withdraw = useCallback(
    async (mentorId: string) => {
      if (!userId) return;
      const matchId = pendingMatchIds.get(mentorId);
      if (!matchId) return;
      setWithdrawingMentor(mentorId);
      try {
        const res = await fetch("/api/mentorship/match", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            matchId,
            action: "withdraw",
            menteeId: userId,
          }),
        });
        if (res.ok) {
          setStatusMap((prev) => {
            const m = new Map(prev);
            m.delete(mentorId);
            return m;
          });
          setPendingMatchIds((prev) => {
            const m = new Map(prev);
            m.delete(mentorId);
            return m;
          });
          toast.success("Request withdrawn successfully.");
        } else {
          const err = await res.json();
          toast.error(err.error || "Failed to withdraw request");
        }
      } catch (error) {
        console.error("Error withdrawing request:", error);
        toast.error("Failed to withdraw request. Please try again.");
      } finally {
        setWithdrawingMentor(null);
      }
    },
    [userId, pendingMatchIds, toast]
  );

  /** Withdraw the existing pending request, then send the new one. */
  const confirmSwitch = useCallback(async () => {
    if (!userId || !conflict) return;
    setSwitching(true);
    try {
      const wr = await fetch("/api/mentorship/match", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: conflict.pendingMatchId,
          action: "withdraw",
          menteeId: userId,
        }),
      });
      if (!wr.ok) {
        const err = await wr.json();
        toast.error(err.error || "Failed to withdraw existing request");
        return;
      }
      const res = await postMatch(conflict.newMentorId);
      if (res.ok) {
        toast.success("Request sent!");
        setConflict(null);
        await refresh();
      } else {
        const err = await res.json();
        toast.error(`Failed to send request: ${err.error || err.message || ""}`);
        await refresh();
      }
    } catch (error) {
      console.error("Error switching request:", error);
      toast.error("An error occurred. Please try again.");
    } finally {
      setSwitching(false);
    }
  }, [userId, conflict, postMatch, refresh, toast]);

  return {
    statusMap,
    pendingMatchIds,
    sessionInfo,
    requestingMentor,
    withdrawingMentor,
    conflict,
    switching,
    requestMatch,
    withdraw,
    confirmSwitch,
    cancelConflict: () => setConflict(null),
    refresh,
  };
}
