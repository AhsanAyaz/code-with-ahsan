'use client'

import { useState, useEffect, useContext } from 'react'
import { useRouter } from 'next/navigation'
import { AuthContext } from '@/contexts/AuthContext'
import { useMentorship } from '@/contexts/MentorshipContext'
import Link from 'next/link'

interface AdminStats {
  totalMentors: number
  totalMentees: number
  totalMatches: number
  activeMatches: number
  pendingMatches: number
  completedGoals: number
  totalGoals: number
  totalSessions: number
  averageRating: number
  lowRatingAlerts: number
}

interface Alert {
  id: string
  type: string
  sessionId: string
  rating: number
  feedback: string
  createdAt: string
  resolved: boolean
}

export default function AdminPage() {
  const router = useRouter()
  const { setShowLoginPopup } = useContext(AuthContext)
  const { user, profile, loading } = useMentorship()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loadingStats, setLoadingStats] = useState(true)

  // For demo purposes, allow any mentor to see admin. In production, add proper admin role check.
  const isAdmin = profile?.role === 'mentor'

  useEffect(() => {
    if (!loading && !user) {
      setShowLoginPopup(true)
    }
  }, [loading, user, setShowLoginPopup])

  useEffect(() => {
    if (!loading && profile && !isAdmin) {
      router.push('/mentorship')
    }
  }, [loading, profile, isAdmin, router])

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/mentorship/admin/stats')
        if (response.ok) {
          const data = await response.json()
          setStats(data.stats)
          setAlerts(data.alerts || [])
        }
      } catch (error) {
        console.error('Error fetching admin stats:', error)
      } finally {
        setLoadingStats(false)
      }
    }

    if (user && isAdmin) {
      fetchStats()
    }
  }, [user, isAdmin])

  const resolveAlert = async (alertId: string) => {
    try {
      await fetch('/api/mentorship/admin/alerts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId, resolved: true }),
      })
      setAlerts(prev => prev.filter(a => a.id !== alertId))
    } catch (error) {
      console.error('Error resolving alert:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    )
  }

  if (!user || !isAdmin) {
    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body text-center">
          <h2 className="card-title justify-center text-2xl">Admin Access Required</h2>
          <p className="text-base-content/70 mt-2">You don't have permission to view this page.</p>
          <div className="card-actions justify-center mt-6">
            <Link href="/mentorship" className="btn btn-primary">
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Admin Dashboard</h2>
          <p className="text-base-content/70">Program metrics and ROI reporting</p>
        </div>
        <Link href="/mentorship" className="btn btn-ghost btn-sm">
          ← Back to Dashboard
        </Link>
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="alert alert-error">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <h3 className="font-bold">{alerts.length} Low Rating Alert(s)</h3>
            <p className="text-sm">Sessions that received 1-star ratings need attention.</p>
          </div>
          <button className="btn btn-sm" onClick={() => (document.getElementById('alerts-modal') as HTMLDialogElement)?.showModal()}>
            View Alerts
          </button>
        </div>
      )}

      {/* Stats Grid */}
      {loadingStats ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      ) : stats && (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Enrollment Stats */}
          <div className="stats shadow bg-base-100">
            <div className="stat">
              <div className="stat-figure text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="stat-title">Total Mentors</div>
              <div className="stat-value text-primary">{stats.totalMentors}</div>
            </div>
          </div>

          <div className="stats shadow bg-base-100">
            <div className="stat">
              <div className="stat-figure text-secondary">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m9 5.197v-1a6 6 0 00-3-5.197" />
                </svg>
              </div>
              <div className="stat-title">Total Mentees</div>
              <div className="stat-value text-secondary">{stats.totalMentees}</div>
            </div>
          </div>

          <div className="stats shadow bg-base-100">
            <div className="stat">
              <div className="stat-figure text-success">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="stat-title">Active Matches</div>
              <div className="stat-value text-success">{stats.activeMatches}</div>
              <div className="stat-desc">of {stats.totalMatches} total</div>
            </div>
          </div>

          <div className="stats shadow bg-base-100">
            <div className="stat">
              <div className="stat-figure text-info">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <div className="stat-title">Avg Session Rating</div>
              <div className="stat-value text-info">{stats.averageRating.toFixed(1)}</div>
              <div className="stat-desc">out of 5 stars</div>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      {stats && (
        <div className="grid md:grid-cols-3 gap-4">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h3 className="card-title text-lg">📊 Matching Rate</h3>
              <div className="radial-progress text-primary" style={{ '--value': stats.totalMatches > 0 ? Math.round((stats.activeMatches / (stats.totalMentors + stats.totalMentees)) * 100) : 0, '--size': '8rem' } as React.CSSProperties} role="progressbar">
                {stats.totalMatches > 0 ? Math.round((stats.activeMatches / (stats.totalMentors + stats.totalMentees)) * 100) : 0}%
              </div>
              <p className="text-sm text-base-content/60 mt-2">
                Percentage of users in active mentorships
              </p>
            </div>
          </div>

          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h3 className="card-title text-lg">🎯 Goal Completion</h3>
              <div className="radial-progress text-success" style={{ '--value': stats.totalGoals > 0 ? Math.round((stats.completedGoals / stats.totalGoals) * 100) : 0, '--size': '8rem' } as React.CSSProperties} role="progressbar">
                {stats.totalGoals > 0 ? Math.round((stats.completedGoals / stats.totalGoals) * 100) : 0}%
              </div>
              <p className="text-sm text-base-content/60 mt-2">
                {stats.completedGoals} of {stats.totalGoals} goals completed
              </p>
            </div>
          </div>

          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h3 className="card-title text-lg">📅 Total Sessions</h3>
              <div className="text-5xl font-bold text-accent">{stats.totalSessions}</div>
              <p className="text-sm text-base-content/60 mt-2">
                Mentorship sessions conducted
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pending Requests Info */}
      {stats && stats.pendingMatches > 0 && (
        <div className="alert alert-warning">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span><strong>{stats.pendingMatches}</strong> pending match requests awaiting mentor approval.</span>
        </div>
      )}

      {/* Alerts Modal */}
      <dialog id="alerts-modal" className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">Low Rating Alerts</h3>
          <div className="space-y-4">
            {alerts.map(alert => (
              <div key={alert.id} className="card bg-base-200">
                <div className="card-body p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold">Session received 1-star rating</div>
                      {alert.feedback && (
                        <p className="text-sm text-base-content/70 mt-1">"{alert.feedback}"</p>
                      )}
                      <div className="text-xs text-base-content/50 mt-2">
                        {new Date(alert.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <button 
                      className="btn btn-success btn-sm"
                      onClick={() => resolveAlert(alert.id)}
                    >
                      Resolve
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="modal-action">
            <form method="dialog">
              <button className="btn">Close</button>
            </form>
          </div>
        </div>
      </dialog>
    </div>
  )
}
