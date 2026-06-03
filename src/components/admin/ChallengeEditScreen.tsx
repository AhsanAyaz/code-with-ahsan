'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import ChallengeForm from '@/components/admin/ChallengeForm';
import { Challenge } from '@/types/challenges';
import { ADMIN_TOKEN_KEY } from '@/components/admin/AdminAuthGate';

/**
 * Client component that manages the state for editing a challenge.
 * Fetches the challenge data based on the route parameter and then
 * renders the ChallengeForm in edit mode.
 */
export default function ChallengeEditScreen() {
  const params = useParams();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChallenge = async () => {
      try {
        const token = localStorage.getItem(ADMIN_TOKEN_KEY);
        const res = await fetch(`/api/admin/challenges/${params.id}`, {
          headers: token ? { 'x-admin-token': token } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setChallenge(data.challenge);
        }
      } catch (error) {
        console.error('Failed to fetch challenge', error);
      } finally {
        setLoading(false);
      }
    };
    if (params.id) {
      fetchChallenge();
    }
  }, [params.id]);

  if (loading) {
    return <div className="flex justify-center py-12"><span className="loading loading-spinner loading-lg text-primary"></span></div>;
  }

  if (!challenge) {
    return <div className="alert alert-error">Challenge not found</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Edit Challenge</h1>
      <ChallengeForm initialData={challenge} isEdit={true} />
    </div>
  );
}
