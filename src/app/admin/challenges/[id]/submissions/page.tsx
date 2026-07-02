"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ADMIN_TOKEN_KEY } from "@/components/admin/AdminAuthGate";
import type { Challenge, Submission } from "@/types/challenges";

export default function AdminChallengeSubmissionsPage() {
  const params = useParams();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem(ADMIN_TOKEN_KEY);
        const res = await fetch(`/api/admin/challenges/${params.id}/submissions`, {
          headers: token ? { "x-admin-token": token } : {},
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to load submissions");
        }
        const data = await res.json();
        setChallenge(data.challenge);
        setSubmissions(data.submissions);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    };
    if (params.id) fetchData();
  }, [params.id]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/challenges" className="btn btn-ghost btn-sm">
          ← Challenges
        </Link>
        {challenge && <h1 className="text-2xl font-bold">Submissions — {challenge.title}</h1>}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg text-primary" />
        </div>
      ) : error ? (
        <div className="alert alert-error">{error}</div>
      ) : submissions.length === 0 ? (
        <div className="alert alert-info">No submissions yet for this challenge.</div>
      ) : (
        <div className="overflow-x-auto bg-base-100 shadow-xl rounded-box">
          <table className="table w-full">
            <thead>
              <tr>
                <th>User</th>
                <th>Repo</th>
                <th>Demo</th>
                <th>LinkedIn</th>
                <th>Status</th>
                <th>Score</th>
                <th>Submitted At</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      {s.userAvatar && (
                        <div className="avatar">
                          <div className="w-8 rounded-full">
                            <img src={s.userAvatar} alt={s.userName} />
                          </div>
                        </div>
                      )}
                      <span className="font-medium">{s.userName}</span>
                    </div>
                  </td>
                  <td>
                    <a
                      href={s.repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link link-primary text-sm"
                    >
                      {s.repoUrl.replace("https://github.com/", "")}
                    </a>
                  </td>
                  <td>
                    {s.demoUrl ? (
                      <a
                        href={s.demoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="link link-secondary text-sm"
                      >
                        Demo
                      </a>
                    ) : (
                      <span className="text-base-content/40 text-sm">—</span>
                    )}
                  </td>
                  <td>
                    <a
                      href={s.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link link-primary text-sm"
                    >
                      Post
                    </a>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        s.status === "approved"
                          ? "badge-success"
                          : s.status === "pending"
                            ? "badge-warning"
                            : "badge-error"
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td>{s.score}</td>
                  <td className="text-sm text-base-content/70">
                    {new Date(s.submittedAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && submissions.length > 0 && (
        <p className="text-sm text-base-content/60">
          {submissions.length} submission{submissions.length !== 1 ? "s" : ""} total
        </p>
      )}
    </div>
  );
}
