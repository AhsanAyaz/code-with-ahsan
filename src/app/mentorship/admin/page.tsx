'use client'

import { useState, useEffect, useContext } from 'react'
import { useRouter } from 'next/navigation'
import { AuthContext } from '@/contexts/AuthContext'
import { useMentorship, MentorshipProfile } from '@/contexts/MentorshipContext'
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

interface ProfileWithDetails extends MentorshipProfile {
  cvUrl?: string
  majorProjects?: string
  adminNotes?: string
  acceptedAt?: string
  disabledSessionsCount?: number
  avgRating?: number
  ratingCount?: number
}

type TabType = 'overview' | 'pending-mentors' | 'all-mentors' | 'all-mentees'

const ADMIN_TOKEN_KEY = 'mentorship_admin_token'

export default function AdminPage() {
  const router = useRouter()
  const { setShowLoginPopup } = useContext(AuthContext)
  const { user, profile, loading } = useMentorship()
  
  // Admin password authentication state
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [adminPassword, setAdminPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)
  
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loadingStats, setLoadingStats] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [profiles, setProfiles] = useState<ProfileWithDetails[]>([])
  const [loadingProfiles, setLoadingProfiles] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Check for existing admin session on mount
  useEffect(() => {
    const checkAdminSession = async () => {
      const token = localStorage.getItem(ADMIN_TOKEN_KEY)
      if (!token) {
        setCheckingAuth(false)
        return
      }
      try {
        const response = await fetch('/api/mentorship/admin/auth', {
          method: 'GET',
          headers: { 'x-admin-token': token },
        })
        const data = await response.json()
        if (data.valid) {
          setIsAdminAuthenticated(true)
        } else {
          localStorage.removeItem(ADMIN_TOKEN_KEY)
        }
      } catch (error) {
        console.error('Error checking admin session:', error)
        localStorage.removeItem(ADMIN_TOKEN_KEY)
      } finally {
        setCheckingAuth(false)
      }
    }
    checkAdminSession()
  }, [])

  useEffect(() => {
    if (!loading && !user) {
      setShowLoginPopup(true)
    }
  }, [loading, user, setShowLoginPopup])

  // Handle admin login
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoggingIn(true)
    setAuthError('')
    try {
      const response = await fetch('/api/mentorship/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword }),
      })
      const data = await response.json()
      if (response.ok && data.token) {
        localStorage.setItem(ADMIN_TOKEN_KEY, data.token)
        setIsAdminAuthenticated(true)
        setAdminPassword('')
      } else {
        setAuthError(data.error || 'Invalid password')
      }
    } catch (error) {
      console.error('Admin login error:', error)
      setAuthError('Authentication failed. Please try again.')
    } finally {
      setLoggingIn(false)
    }
  }

  // Handle admin logout
  const handleAdminLogout = async () => {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY)
    if (token) {
      try {
        await fetch('/api/mentorship/admin/auth', {
          method: 'DELETE',
          headers: { 'x-admin-token': token },
        })
      } catch (error) {
        console.error('Logout error:', error)
      }
    }
    localStorage.removeItem(ADMIN_TOKEN_KEY)
    setIsAdminAuthenticated(false)
  }

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

    if (isAdminAuthenticated) {
      fetchStats()
    }
  }, [isAdminAuthenticated])

  // Fetch profiles based on active tab
  useEffect(() => {
    const fetchProfiles = async () => {
      if (activeTab === 'overview') return
      
      setLoadingProfiles(true)
      try {
        let url = '/api/mentorship/admin/profiles?'
        if (activeTab === 'pending-mentors') {
          url += 'role=mentor&status=pending'
        } else if (activeTab === 'all-mentors') {
          url += 'role=mentor'
        } else if (activeTab === 'all-mentees') {
          url += 'role=mentee'
        }
        
        const response = await fetch(url)
        if (response.ok) {
          const data = await response.json()
          setProfiles(data.profiles || [])
        }
      } catch (error) {
        console.error('Error fetching profiles:', error)
      } finally {
        setLoadingProfiles(false)
      }
    }

    if (isAdminAuthenticated) {
      fetchProfiles()
    }
  }, [isAdminAuthenticated, activeTab])

  const handleStatusChange = async (uid: string, newStatus: 'accepted' | 'declined' | 'disabled', reactivateSessions = false) => {
    setActionLoading(uid)
    try {
      const response = await fetch('/api/mentorship/admin/profiles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, status: newStatus, reactivateSessions }),
      })
      
      if (response.ok) {
        const data = await response.json()
        
        // When re-enabling, fetch the updated profile to get accurate disabledSessionsCount
        let updatedDisabledCount: number | undefined = undefined
        if (newStatus === 'accepted' && !reactivateSessions) {
          // Fetch current disabled sessions count for this user
          const profileRes = await fetch(`/api/mentorship/admin/profiles?role=${profiles.find(p => p.uid === uid)?.role}`)
          if (profileRes.ok) {
            const profileData = await profileRes.json()
            const updatedProfile = profileData.profiles?.find((p: ProfileWithDetails) => p.uid === uid)
            updatedDisabledCount = updatedProfile?.disabledSessionsCount ?? 0
          }
        }
        
        // Update local state
        setProfiles(prev => prev.map(p => 
          p.uid === uid ? { 
            ...p, 
            status: newStatus,
            // Use fetched count, or reset to 0 if reactivated
            disabledSessionsCount: reactivateSessions ? 0 : (updatedDisabledCount ?? p.disabledSessionsCount)
          } : p
        ))
        
        // If we're on pending tab and accepted/declined, remove from list
        if (activeTab === 'pending-mentors') {
          setProfiles(prev => prev.filter(p => p.uid !== uid))
        }
        
        // Show success message if sessions were reactivated
        if (data.reactivatedSessions > 0) {
          alert(`${data.reactivatedSessions} mentorship session(s) have been reactivated.`)
        }
      }
    } catch (error) {
      console.error('Error updating status:', error)
    } finally {
      setActionLoading(null)
    }
  }

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

  const getStatusBadge = (status: string | undefined) => {
    switch (status) {
      case 'pending':
        return <span className="badge badge-warning">Pending</span>
      case 'accepted':
        return <span className="badge badge-success">Accepted</span>
      case 'declined':
        return <span className="badge badge-error">Declined</span>
      case 'disabled':
        return <span className="badge badge-neutral">Disabled</span>
      default:
        return <span className="badge badge-ghost">Unknown</span>
    }
  }

  // Loading states
  if (loading || checkingAuth) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    )
  }

  // User must be logged in first
  if (!user) {
    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body text-center">
          <h2 className="card-title justify-center text-2xl">Sign In Required</h2>
          <p className="text-base-content/70 mt-2">Please sign in to access the admin panel.</p>
          <div className="card-actions justify-center mt-6">
            <button className="btn btn-primary" onClick={() => setShowLoginPopup(true)}>
              Sign In
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Admin password protection - show login form
  if (!isAdminAuthenticated) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="card bg-base-100 shadow-xl w-full max-w-md">
          <div className="card-body">
            <div className="text-center mb-4">
              <div className="text-5xl mb-4">🔐</div>
              <h2 className="card-title justify-center text-2xl">Admin Access</h2>
              <p className="text-base-content/70 mt-2">
                Enter the admin password to continue.
              </p>
            </div>

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Admin Password</span>
                </label>
                <input
                  type="password"
                  placeholder="Enter admin password"
                  className={`input input-bordered w-full ${authError ? 'input-error' : ''}`}
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  disabled={loggingIn}
                  autoFocus
                />
                {authError && (
                  <label className="label">
                    <span className="label-text-alt text-error">{authError}</span>
                  </label>
                )}
              </div>

              <button 
                type="submit" 
                className="btn btn-primary w-full"
                disabled={loggingIn || !adminPassword}
              >
                {loggingIn ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Authenticating...
                  </>
                ) : (
                  'Access Admin Panel'
                )}
              </button>
            </form>

            <div className="divider">OR</div>

            <Link href="/mentorship/dashboard" className="btn btn-ghost btn-sm w-full">
              ← Back to Dashboard
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
          <p className="text-base-content/70">Manage mentors, mentees, and program metrics</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleAdminLogout} className="btn btn-ghost btn-sm">
            🔓 Logout Admin
          </button>
          <Link href="/mentorship/dashboard" className="btn btn-ghost btn-sm">
            ← Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div role="tablist" className="tabs tabs-boxed bg-base-200 p-1">
        <button
          role="tab"
          className={`tab ${activeTab === 'overview' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button>
        <button
          role="tab"
          className={`tab ${activeTab === 'pending-mentors' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('pending-mentors')}
        >
          ⏳ Pending Mentors
          {stats && profiles.filter(p => p.role === 'mentor' && p.status === 'pending').length > 0 && (
            <span className="badge badge-warning badge-sm ml-2">
              {profiles.filter(p => p.role === 'mentor' && p.status === 'pending').length}
            </span>
          )}
        </button>
        <button
          role="tab"
          className={`tab ${activeTab === 'all-mentors' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('all-mentors')}
        >
          🎯 All Mentors
        </button>
        <button
          role="tab"
          className={`tab ${activeTab === 'all-mentees' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('all-mentees')}
        >
          🚀 All Mentees
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <>
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
        </>
      )}

      {/* Profile Lists */}
      {activeTab !== 'overview' && (
        <div className="space-y-4">
          {loadingProfiles ? (
            <div className="flex justify-center py-12">
              <span className="loading loading-spinner loading-lg text-primary"></span>
            </div>
          ) : profiles.length === 0 ? (
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body text-center py-12">
                <div className="text-5xl mb-4">📭</div>
                <h3 className="text-xl font-semibold">No {activeTab.replace('-', ' ')}</h3>
                <p className="text-base-content/70">
                  {activeTab === 'pending-mentors' 
                    ? 'All mentor registrations have been reviewed!'
                    : 'No profiles found in this category.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              {profiles.map(p => (
                <div key={p.uid} className="card bg-base-100 shadow-xl">
                  <div className="card-body">
                    <div className="flex flex-col md:flex-row md:items-start gap-4">
                      {/* Avatar and Basic Info */}
                      <div className="flex items-start gap-4 flex-1">
                        <div className="avatar">
                          <div className="w-16 h-16 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                            {p.photoURL ? (
                              <img src={p.photoURL} alt={p.displayName || 'Profile'} />
                            ) : (
                              <div className="bg-primary text-primary-content flex items-center justify-center text-2xl font-bold w-full h-full">
                                {p.displayName?.charAt(0) || '?'}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-lg font-bold">{p.displayName}</h3>
                            {getStatusBadge(p.status)}
                            <span className="badge badge-outline">
                              {p.role === 'mentor' ? '🎯 Mentor' : '🚀 Mentee'}
                            </span>
                          </div>
                          <p className="text-sm text-base-content/70">{p.email}</p>
                          {p.currentRole && (
                            <p className="text-sm text-base-content/70 mt-1">{p.currentRole}</p>
                          )}
                          
                          {/* Expertise Tags */}
                          {p.expertise && p.expertise.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {p.expertise.map(skill => (
                                <span key={skill} className="badge badge-primary badge-sm">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          )}
                          
                          {/* Star Rating (for mentors) */}
                          {p.role === 'mentor' && (p.ratingCount ?? 0) > 0 && (
                            <div className="flex items-center gap-1 mt-2">
                              <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <svg
                                    key={star}
                                    className={`w-4 h-4 ${star <= (p.avgRating ?? 0) ? 'text-yellow-400' : 'text-base-content/20'}`}
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                ))}
                              </div>
                              <span className="text-xs text-base-content/60">
                                {p.avgRating} ({p.ratingCount} reviews)
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2">
                        {p.status === 'pending' && (
                          <>
                            <button
                              className="btn btn-success btn-sm"
                              disabled={actionLoading === p.uid}
                              onClick={() => handleStatusChange(p.uid, 'accepted')}
                            >
                              {actionLoading === p.uid ? (
                                <span className="loading loading-spinner loading-xs"></span>
                              ) : '✓ Accept'}
                            </button>
                            <button
                              className="btn btn-error btn-sm"
                              disabled={actionLoading === p.uid}
                              onClick={() => handleStatusChange(p.uid, 'declined')}
                            >
                              {actionLoading === p.uid ? (
                                <span className="loading loading-spinner loading-xs"></span>
                              ) : '✗ Decline'}
                            </button>
                          </>
                        )}
                        {p.status !== 'disabled' && p.status !== 'pending' && (
                          <button
                            className="btn btn-warning btn-sm"
                            disabled={actionLoading === p.uid}
                            onClick={() => handleStatusChange(p.uid, 'disabled')}
                          >
                            {actionLoading === p.uid ? (
                              <span className="loading loading-spinner loading-xs"></span>
                            ) : '🚫 Disable'}
                          </button>
                        )}
                        {p.status === 'disabled' && (
                          <>
                            <button
                              className="btn btn-success btn-sm"
                              disabled={actionLoading === p.uid}
                              onClick={() => handleStatusChange(p.uid, 'accepted')}
                            >
                              {actionLoading === p.uid ? (
                                <span className="loading loading-spinner loading-xs"></span>
                              ) : '✓ Re-enable'}
                            </button>
                          </>
                        )}
                        {/* Show re-enable sessions button for accepted users with disabled sessions */}
                        {p.status === 'accepted' && (p.disabledSessionsCount ?? 0) > 0 && (
                          <button
                            className="btn btn-info btn-sm"
                            disabled={actionLoading === p.uid}
                            onClick={() => handleStatusChange(p.uid, 'accepted', true)}
                          >
                            {actionLoading === p.uid ? (
                              <span className="loading loading-spinner loading-xs"></span>
                            ) : `🔄 Re-enable ${p.disabledSessionsCount} Session(s)`}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expandable Details */}
                    <div className="collapse collapse-arrow bg-base-200 mt-4">
                      <input type="checkbox" />
                      <div className="collapse-title font-medium">
                        View Full Profile Details
                      </div>
                      <div className="collapse-content">
                        <div className="grid md:grid-cols-2 gap-4 pt-2">
                          {/* Bio */}
                          {p.bio && (
                            <div>
                              <h4 className="font-semibold text-sm mb-1">Bio</h4>
                              <p className="text-sm text-base-content/70">{p.bio}</p>
                            </div>
                          )}

                          {/* CV Link */}
                          {p.cvUrl && (
                            <div>
                              <h4 className="font-semibold text-sm mb-1">CV / Resume</h4>
                              <a 
                                href={p.cvUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="link link-primary text-sm"
                              >
                                View CV →
                              </a>
                            </div>
                          )}

                          {/* Major Projects */}
                          {p.majorProjects && (
                            <div className="md:col-span-2">
                              <h4 className="font-semibold text-sm mb-1">Major Projects & Experience</h4>
                              <p className="text-sm text-base-content/70 whitespace-pre-wrap">{p.majorProjects}</p>
                            </div>
                          )}

                          {/* Career Goals (for mentees) */}
                          {p.careerGoals && (
                            <div className="md:col-span-2">
                              <h4 className="font-semibold text-sm mb-1">Career Goals</h4>
                              <p className="text-sm text-base-content/70">{p.careerGoals}</p>
                            </div>
                          )}

                          {/* Registration Info */}
                          <div>
                            <h4 className="font-semibold text-sm mb-1">Registered</h4>
                            <p className="text-sm text-base-content/70">
                              {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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
                        <p className="text-sm text-base-content/70 mt-1">&quot;{alert.feedback}&quot;</p>
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
