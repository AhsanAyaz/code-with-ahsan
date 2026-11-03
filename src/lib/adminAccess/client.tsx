"use client";

/**
 * src/lib/adminAccess/client.tsx
 *
 * Client side of admin portal access. `AdminAccessProvider` resolves the
 * signed-in user's portal role via GET /api/admin/me and exposes `can(action)`
 * from the shared ACL in ./actions so UI can hide or disable operations.
 *
 * Must render inside MentorshipProvider (the admin layout already does), which
 * owns the Firebase user.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { authFetch } from "@/lib/apiClient";
import { useMentorship } from "@/contexts/MentorshipContext";
import { can as canRole, isAdminRole, type AdminAction, type AdminRole } from "./actions";

/** Fetch wrapper for admin API calls: attaches the Firebase ID token as Bearer. */
export function adminFetch(url: string, options: RequestInit = {}): Promise<Response> {
  return authFetch(url, options);
}

export type AdminAccessStatus = "loading" | "signed-out" | "no-access" | "ready";

export interface AdminAccessValue {
  status: AdminAccessStatus;
  role: AdminRole | null;
  email: string | null;
  can: (action: AdminAction) => boolean;
  refresh: () => Promise<void>;
}

const AdminAccessContext = createContext<AdminAccessValue | undefined>(undefined);

/** Outcome of one /api/admin/me lookup, tagged with the uid it was made for. */
interface AccessResult {
  uid: string;
  status: Exclude<AdminAccessStatus, "loading">;
  role: AdminRole | null;
  email: string | null;
}

async function fetchAccess(uid: string, fallbackEmail: string | null): Promise<AccessResult> {
  try {
    const res = await adminFetch("/api/admin/me");
    const data = res.ok ? ((await res.json()) as { email?: string; role?: unknown }) : null;
    if (data && isAdminRole(data.role)) {
      return { uid, status: "ready", role: data.role, email: data.email ?? fallbackEmail };
    }
    return {
      uid,
      status: res.status === 401 ? "signed-out" : "no-access",
      role: null,
      email: fallbackEmail,
    };
  } catch (err) {
    console.error("[adminAccess] failed to load admin role", err);
    return { uid, status: "no-access", role: null, email: fallbackEmail };
  }
}

export function AdminAccessProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useMentorship();
  const [result, setResult] = useState<AccessResult | null>(null);
  const requestSeq = useRef(0);

  const uid = user?.uid ?? null;
  const userEmail = user?.email ?? null;

  useEffect(() => {
    if (loading || !uid) return;
    const seq = ++requestSeq.current;
    fetchAccess(uid, userEmail).then((next) => {
      if (seq === requestSeq.current) setResult(next);
    });
  }, [loading, uid, userEmail]);

  const load = useCallback(async () => {
    if (!uid) return;
    const seq = ++requestSeq.current;
    const next = await fetchAccess(uid, userEmail);
    if (seq === requestSeq.current) setResult(next);
  }, [uid, userEmail]);

  // Derive what to expose: a result only counts for the user it was fetched for.
  const current = user && result?.uid === user.uid ? result : null;
  const status: AdminAccessStatus = loading
    ? "loading"
    : !user
      ? "signed-out"
      : current
        ? current.status
        : "loading";
  const role = status === "ready" ? (current?.role ?? null) : null;
  const email = current?.email ?? user?.email ?? null;

  const value = useMemo<AdminAccessValue>(
    () => ({
      status,
      role,
      email,
      can: (action: AdminAction) => canRole(role, action),
      refresh: load,
    }),
    [status, role, email, load]
  );

  return <AdminAccessContext.Provider value={value}>{children}</AdminAccessContext.Provider>;
}

export function useAdminAccess(): AdminAccessValue {
  const ctx = useContext(AdminAccessContext);
  if (!ctx) {
    throw new Error("useAdminAccess must be used within an AdminAccessProvider");
  }
  return ctx;
}
