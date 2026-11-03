"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { format } from "date-fns";
import { useToast } from "@/contexts/ToastContext";
import { useMentorship } from "@/contexts/MentorshipContext";
import { adminFetch, adminErrorMessage } from "@/lib/adminAccess/client";
import type { AdminRole } from "@/lib/adminAccess/actions";
import ConfirmModal from "@/components/ui/ConfirmModal";
import RoleBadge from "@/components/admin/RoleBadge";

interface TeamMember {
  uid: string;
  email: string;
  displayName: string | null;
  role: AdminRole;
  grantedBy: { uid: string; email: string } | null;
  grantedAt: string | null;
}

async function readError(res: Response, fallback: string): Promise<string> {
  if (res.status === 403) return adminErrorMessage(res, fallback);
  const data = (await res.json().catch(() => null)) as { error?: unknown } | null;
  return typeof data?.error === "string" ? data.error : fallback;
}

function grantedByLabel(grantedBy: TeamMember["grantedBy"]): string {
  if (!grantedBy) return "Unknown";
  if (grantedBy.uid === "cli" || grantedBy.email.startsWith("cli:")) return "Setup script";
  return grantedBy.email || grantedBy.uid;
}

export default function TeamClient() {
  const toast = useToast();
  const { user } = useMentorship();
  const myUid = user?.uid ?? null;

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AdminRole>("moderator");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<TeamMember | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await adminFetch("/api/admin/team");
      if (!res.ok) {
        setLoadError(await readError(res, "Could not load the team."));
        return;
      }
      const data = (await res.json()) as { members: TeamMember[] };
      setMembers(data.members);
    } catch {
      setLoadError("Could not load the team.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    setAddError(null);
    setAdding(true);
    try {
      const res = await adminFetch("/api/admin/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role }),
      });
      if (!res.ok) {
        setAddError(await readError(res, "Could not add that person."));
        return;
      }
      toast.success(`${email.trim()} is now a ${role}.`);
      setEmail("");
      await load();
    } catch {
      setAddError("Could not add that person.");
    } finally {
      setAdding(false);
    }
  };

  const handleRoleChange = async (member: TeamMember, next: AdminRole) => {
    if (next === member.role) return;
    setBusyUid(member.uid);
    try {
      const res = await adminFetch(`/api/admin/team/${member.uid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: next }),
      });
      if (!res.ok) {
        toast.error(await readError(res, "Could not change the role."));
        return;
      }
      toast.success(`${member.email} is now a ${next}.`);
      setMembers((prev) => prev.map((m) => (m.uid === member.uid ? { ...m, role: next } : m)));
    } catch {
      toast.error("Could not change the role.");
    } finally {
      setBusyUid(null);
    }
  };

  const handleRemove = async () => {
    const member = removeTarget;
    if (!member) return;
    setRemoveTarget(null);
    setBusyUid(member.uid);
    try {
      const res = await adminFetch(`/api/admin/team/${member.uid}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error(await readError(res, "Could not remove access."));
        return;
      }
      toast.success(`Removed ${member.email} from the team.`);
      setMembers((prev) => prev.filter((m) => m.uid !== member.uid));
    } catch {
      toast.error("Could not remove access.");
    } finally {
      setBusyUid(null);
    }
  };

  const adminCount = members.filter((m) => m.role === "admin").length;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold">Team</h1>
        <p className="text-base-content/70 mt-1">People who can sign in to this admin portal.</p>
      </header>

      <section className="card bg-base-200" aria-labelledby="add-person-heading">
        <div className="card-body gap-4">
          <h2 id="add-person-heading" className="card-title text-lg">
            Add a person
          </h2>
          <form onSubmit={handleAdd} className="flex flex-col gap-3 md:flex-row md:items-end">
            <label className="form-control w-full md:max-w-sm">
              <span className="label-text mb-1">Email they sign in with</span>
              <input
                type="email"
                required
                className="input input-bordered w-full"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={adding}
              />
            </label>
            <label className="form-control w-full md:w-48">
              <span className="label-text mb-1">Role</span>
              <select
                className="select select-bordered w-full"
                value={role}
                onChange={(e) => setRole(e.target.value as AdminRole)}
                disabled={adding}
              >
                <option value="moderator">Moderator</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <button type="submit" className="btn btn-primary" disabled={adding || !email.trim()}>
              {adding && <span className="loading loading-spinner loading-sm" />}
              Add to team
            </button>
          </form>
          {addError && (
            <div role="alert" className="alert alert-error alert-soft text-sm">
              {addError}
            </div>
          )}
          <dl className="grid gap-2 text-sm text-base-content/70 sm:grid-cols-2">
            <div className="flex gap-2">
              <dt>
                <RoleBadge role="moderator" />
              </dt>
              <dd>Reviews, approves and edits. Can&apos;t delete, decline or email everyone.</dd>
            </div>
            <div className="flex gap-2">
              <dt>
                <RoleBadge role="admin" />
              </dt>
              <dd>Everything a moderator can, plus deletes, mass email and this team page.</dd>
            </div>
          </dl>
        </div>
      </section>

      <section aria-labelledby="members-heading" className="space-y-3">
        <h2 id="members-heading" className="text-lg font-semibold">
          {loading ? "Members" : `${members.length} ${members.length === 1 ? "member" : "members"}`}
        </h2>

        {loading ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-lg" />
          </div>
        ) : loadError ? (
          <div role="alert" className="alert alert-error">
            <span>{loadError}</span>
            <button className="btn btn-sm" onClick={load}>
              Try again
            </button>
          </div>
        ) : members.length === 0 ? (
          <p className="text-base-content/70">
            No one has a role yet. Add the first person with the form above.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-box border border-base-300">
            <table className="table">
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Role</th>
                  <th>Granted</th>
                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const isMe = m.uid === myUid;
                  const isLastAdmin = m.role === "admin" && adminCount <= 1;
                  const busy = busyUid === m.uid;
                  const lockReason = isMe
                    ? "You can't change your own role."
                    : isLastAdmin
                      ? "The last admin can't be changed or removed."
                      : null;
                  return (
                    <tr key={m.uid}>
                      <td>
                        <div className="font-medium">
                          {m.displayName || m.email}
                          {isMe && <span className="badge badge-ghost badge-sm ml-2">You</span>}
                        </div>
                        {m.displayName && (
                          <div className="text-sm text-base-content/60">{m.email}</div>
                        )}
                      </td>
                      <td>
                        {lockReason ? (
                          <span className="tooltip" data-tip={lockReason}>
                            <RoleBadge role={m.role} />
                          </span>
                        ) : (
                          <select
                            aria-label={`Role for ${m.email}`}
                            className="select select-bordered select-sm w-36"
                            value={m.role}
                            disabled={busy}
                            onChange={(e) => handleRoleChange(m, e.target.value as AdminRole)}
                          >
                            <option value="moderator">Moderator</option>
                            <option value="admin">Admin</option>
                          </select>
                        )}
                      </td>
                      <td className="text-sm">
                        <div>{grantedByLabel(m.grantedBy)}</div>
                        <div className="text-base-content/60">
                          {m.grantedAt ? format(new Date(m.grantedAt), "d MMM yyyy") : ""}
                        </div>
                      </td>
                      <td className="text-right">
                        {lockReason ? null : (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm text-error"
                            disabled={busy}
                            onClick={() => setRemoveTarget(m)}
                          >
                            {busy && <span className="loading loading-spinner loading-xs" />}
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ConfirmModal
        isOpen={removeTarget !== null}
        title="Remove from team?"
        message={
          removeTarget
            ? `${removeTarget.email} will lose access to the admin portal immediately. You can add them again later.`
            : ""
        }
        confirmLabel="Remove access"
        confirmClass="btn-error"
        onConfirm={handleRemove}
        onCancel={() => setRemoveTarget(null)}
      />
    </div>
  );
}
