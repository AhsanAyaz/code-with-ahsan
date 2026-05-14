"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useToast } from "@/contexts/ToastContext";
import { ADMIN_TOKEN_KEY } from "@/components/admin/AdminAuthGate";
import { format } from "date-fns";
import type { CohortDoc, CohortStatus } from "@/types/ambassador";

interface CohortListItem extends CohortDoc {
  cohortId: string;
}

export default function AdminAmbassadorCohortsPage() {
  const toast = useToast();
  const [cohorts, setCohorts] = useState<CohortListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    startDate: "",
    endDate: "",
    maxSize: 25,
    status: "upcoming" as CohortStatus,
  });

  const adminHeaders = (): HeadersInit => {
    const token = typeof window !== "undefined" ? localStorage.getItem(ADMIN_TOKEN_KEY) : null;
    return { "Content-Type": "application/json", "x-admin-token": token ?? "" };
  };

  const loadCohorts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ambassador/cohorts?scope=all", { headers: adminHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load cohorts");
      setCohorts(data.cohorts ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load cohorts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCohorts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Convert date inputs ("YYYY-MM-DD") to ISO strings for Zod .datetime({ offset: true }).
      const body = {
        name: form.name.trim(),
        startDate: new Date(`${form.startDate}T00:00:00Z`).toISOString(),
        endDate: new Date(`${form.endDate}T00:00:00Z`).toISOString(),
        maxSize: Number(form.maxSize),
        status: form.status,
      };
      const res = await fetch("/api/ambassador/cohorts", {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Create failed");
      toast.success("Cohort created");
      setShowCreate(false);
      setForm({ name: "", startDate: "", endDate: "", maxSize: 25, status: "upcoming" });
      loadCohorts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleWindow = async (cohort: CohortListItem) => {
    try {
      const res = await fetch(`/api/ambassador/cohorts/${cohort.cohortId}`, {
        method: "PATCH",
        headers: adminHeaders(),
        body: JSON.stringify({ applicationWindowOpen: !cohort.applicationWindowOpen }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Toggle failed");
      toast.success(cohort.applicationWindowOpen ? "Window closed" : "Window opened");
      loadCohorts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Toggle failed");
    }
  };

  const changeStatus = async (cohort: CohortListItem, status: CohortStatus) => {
    try {
      const res = await fetch(`/api/ambassador/cohorts/${cohort.cohortId}`, {
        method: "PATCH",
        headers: adminHeaders(),
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Status change failed");
      toast.success(`Status set to ${status}`);
      loadCohorts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Status change failed");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Ambassador Cohorts</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          + New Cohort
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10"><span className="loading loading-spinner loading-lg" /></div>
      ) : cohorts.length === 0 ? (
        <div className="text-center py-10 text-gray-500">No cohorts yet. Create the first one.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-zebra">
            <thead>
              <tr>
                <th>Name</th>
                <th>Start</th>
                <th>End</th>
                <th>Size</th>
                <th>Status</th>
                <th>Window</th>
                <th>Ambassadors</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {cohorts.map((c) => (
                <tr key={c.cohortId}>
                  <td className="font-semibold">{c.name}</td>
                  <td>{c.startDate ? format(new Date(c.startDate), "MMM d, yyyy") : "—"}</td>
                  <td>{c.endDate ? format(new Date(c.endDate), "MMM d, yyyy") : "—"}</td>
                  <td>{c.acceptedCount}/{c.maxSize}</td>
                  <td>
                    <select
                      className="select select-sm select-bordered"
                      value={c.status}
                      onChange={(e) => changeStatus(c, e.target.value as CohortStatus)}
                    >
                      <option value="upcoming">upcoming</option>
                      <option value="active">active</option>
                      <option value="closed">closed</option>
                    </select>
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      className="toggle toggle-primary"
                      checked={c.applicationWindowOpen}
                      onChange={() => toggleWindow(c)}
                    />
                  </td>
                  <td>
                    <Link
                      href={`/admin/ambassadors?cohort=${c.cohortId}&status=accepted`}
                      className="link link-primary"
                    >
                      View ({c.acceptedCount})
                    </Link>
                  </td>
                  <td>
                    <Link href={`/admin/ambassadors?cohort=${c.cohortId}`} className="btn btn-ghost btn-sm">
                      Applications
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Create Cohort</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <input
                type="text"
                placeholder="Cohort name (e.g., Spring 2026)"
                className="input input-bordered w-full"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                minLength={3}
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label text-sm">Start date</label>
                  <input
                    type="date"
                    className="input input-bordered w-full"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="label text-sm">End date</label>
                  <input
                    type="date"
                    className="input input-bordered w-full"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="label text-sm">Max size</label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  className="input input-bordered w-full"
                  value={form.maxSize}
                  onChange={(e) => setForm({ ...form, maxSize: Number(e.target.value) })}
                  required
                />
              </div>
              <div>
                <label className="label text-sm">Status</label>
                <select
                  className="select select-bordered w-full"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as CohortStatus })}
                >
                  <option value="upcoming">upcoming</option>
                  <option value="active">active</option>
                  <option value="closed">closed</option>
                </select>
              </div>
              <div className="modal-action">
                <button type="button" className="btn" onClick={() => setShowCreate(false)} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
          <div className="modal-backdrop" onClick={() => !submitting && setShowCreate(false)} />
        </dialog>
      )}
    </div>
  );
}
