"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { authFetch } from "@/lib/apiClient";
import { ADMIN_TOKEN_KEY } from "@/components/admin/AdminAuthGate";

type Member = {
  uid: string;
  displayName: string;
  email: string | null;
  cohortId: string | null;
  strikes: number;
  referralCode: string | null;
  active: boolean;
  unresolvedFlagCount: number;
};

function adminHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem(ADMIN_TOKEN_KEY) : null;
  return { "x-admin-token": token ?? "" };
}

export function MembersList() {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch("/api/ambassador/members", {
          headers: adminHeaders(),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as { members: Member[] };
        if (!cancelled) setMembers(json.members);
      } catch {
        if (!cancelled) setError("Could not load members. Check your connection and try again.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div role="alert" className="alert alert-error">
        <span>{error}</span>
      </div>
    );
  }

  if (!members) {
    return (
      <div className="py-12 text-center">
        <span className="loading loading-spinner loading-md" aria-label="Loading members" />
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="alert alert-info flex-col items-start">
        <h2 className="font-bold">No active ambassadors found.</h2>
        <p>Once an applicant is accepted into the program, they will appear here.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Cohort</th>
            <th>Strikes</th>
            <th>Flags</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.uid}>
              <td className="font-bold">{m.displayName}</td>
              <td>{m.cohortId ?? "—"}</td>
              <td>
                <span
                  className={
                    m.strikes >= 2
                      ? "badge badge-error font-bold"
                      : m.strikes === 1
                        ? "badge badge-warning font-bold"
                        : "badge badge-ghost"
                  }
                >
                  {m.strikes}
                </span>
              </td>
              <td>
                {m.unresolvedFlagCount > 0 ? (
                  <span className="badge badge-warning font-bold">
                    {m.unresolvedFlagCount}
                  </span>
                ) : (
                  <span className="badge badge-ghost">0</span>
                )}
              </td>
              <td>
                <Link
                  href={`/admin/ambassadors/members/${m.uid}`}
                  className="btn btn-sm btn-ghost"
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
