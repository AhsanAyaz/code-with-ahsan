"use client";
import { useCallback, useEffect, useState } from "react";
import { ADMIN_TOKEN_KEY } from "@/components/admin/AdminAuthGate";

type Bypass = {
  uid: string;
  email: string;
  displayName: string;
  grantedAt: string | null;
  reason: string | null;
};

function adminHeaders(): Record<string, string> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem(ADMIN_TOKEN_KEY) : null;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["x-admin-token"] = token;
  return headers;
}

export default function EligibilityBypassesPage() {
  const [bypasses, setBypasses] = useState<Bypass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [granting, setGranting] = useState(false);
  const [grantError, setGrantError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/ambassador/eligibility-bypasses", {
        headers: adminHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      setBypasses(body.bypasses ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setGranting(true);
    setGrantError(null);
    try {
      const res = await fetch("/api/admin/ambassador/eligibility-bypasses", {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify({ email: email.trim(), reason: reason.trim() || undefined }),
      });
      const body = await res.json();
      if (!res.ok) {
        setGrantError(body.error ?? `HTTP ${res.status}`);
        return;
      }
      setEmail("");
      setReason("");
      await load();
    } catch {
      setGrantError("Network error");
    } finally {
      setGranting(false);
    }
  };

  const handleRevoke = async (uid: string) => {
    setRevoking(uid);
    try {
      await fetch(`/api/admin/ambassador/eligibility-bypasses/${uid}`, {
        method: "DELETE",
        headers: adminHeaders(),
      });
      await load();
    } finally {
      setRevoking(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Eligibility Bypasses</h1>
        <p className="text-base-content/60 mt-1 text-sm">
          Grant a user the ability to apply regardless of account age. Enter their CWA account email address.
        </p>
      </div>

      {/* Grant form */}
      <div className="card bg-base-200 p-6">
        <h2 className="font-semibold mb-4">Grant bypass</h2>
        <form onSubmit={handleGrant} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              className="input input-bordered flex-1"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={granting}
              required
            />
            <input
              type="text"
              className="input input-bordered flex-1"
              placeholder="Reason (optional)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={granting}
            />
            <button type="submit" className="btn btn-primary" disabled={granting}>
              {granting ? <span className="loading loading-spinner loading-sm" /> : "Grant"}
            </button>
          </div>
          {grantError && <p className="text-error text-sm">{grantError}</p>}
        </form>
      </div>

      {/* Bypass list */}
      <div>
        <h2 className="font-semibold mb-3">Active bypasses ({bypasses.length})</h2>
        {loading ? (
          <div className="flex justify-center py-8">
            <span className="loading loading-spinner loading-md" />
          </div>
        ) : error ? (
          <div className="alert alert-error"><span>{error}</span></div>
        ) : bypasses.length === 0 ? (
          <div className="alert alert-info"><span>No bypasses granted yet.</span></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Granted</th>
                  <th>Reason</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {bypasses.map((b) => (
                  <tr key={b.uid}>
                    <td className="font-medium">{b.displayName}</td>
                    <td className="text-base-content/70 text-sm">{b.email}</td>
                    <td className="text-sm whitespace-nowrap">
                      {b.grantedAt ? new Date(b.grantedAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="text-sm text-base-content/60">{b.reason ?? "—"}</td>
                    <td>
                      <button
                        className="btn btn-ghost btn-xs text-error"
                        onClick={() => handleRevoke(b.uid)}
                        disabled={revoking === b.uid}
                      >
                        {revoking === b.uid ? <span className="loading loading-spinner loading-xs" /> : "Revoke"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
