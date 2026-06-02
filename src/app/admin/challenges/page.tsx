'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Challenge } from '@/types/challenges';
import { ADMIN_TOKEN_KEY } from '@/components/admin/AdminAuthGate';

/**
 * Admin Dashboard - Challenges List.
 * Allows administrators to view all existing challenges and navigate
 * to create or edit pages. Protected by an admin auth gate.
 */
export default function AdminChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChallenges = async () => {
      try {
        const token = localStorage.getItem(ADMIN_TOKEN_KEY);
        const res = await fetch('/api/admin/challenges', {
          headers: token ? { 'x-admin-token': token } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setChallenges(data.challenges);
        }
      } catch (error) {
        console.error('Failed to fetch challenges', error);
      } finally {
        setLoading(false);
      }
    };
    fetchChallenges();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Challenges Management</h1>
        <Link href="/admin/challenges/new" className="btn btn-primary">
          Create New Challenge
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      ) : challenges.length === 0 ? (
        <div className="alert alert-info shadow-lg">
          <div>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current flex-shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <span>No challenges found. Create one to get started!</span>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto bg-base-100 shadow-xl rounded-box">
          <table className="table w-full">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Difficulty</th>
                <th>Dates</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {challenges.map((challenge) => (
                <tr key={challenge.id}>
                  <td>
                    <div className="font-bold">{challenge.title}</div>
                    <div className="text-sm opacity-50">{challenge.topic}</div>
                  </td>
                  <td>
                    <span className={`badge ${
                      challenge.status === 'active' ? 'badge-success' :
                      challenge.status === 'upcoming' ? 'badge-warning' : 'badge-ghost'
                    }`}>
                      {challenge.status}
                    </span>
                  </td>
                  <td>{challenge.difficulty}</td>
                  <td>
                    <div className="text-sm">
                      Start: {new Date(challenge.startDate).toLocaleDateString()}
                    </div>
                    <div className="text-sm">
                      End: {new Date(challenge.endDate).toLocaleDateString()}
                    </div>
                  </td>
                  <td>
                    <Link href={`/admin/challenges/${challenge.id}/edit`} className="btn btn-sm btn-outline">
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
