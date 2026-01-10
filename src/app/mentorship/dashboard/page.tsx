'use client'

import { useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AuthContext } from '@/contexts/AuthContext'
import { useMentorship } from '@/contexts/MentorshipContext'
import Link from 'next/link'

interface DashboardStats {
  activeMatches: number
  completedMentorships: number
}

export default function MentorshipDashboardPage() {
  const router = useRouter()
  const { setShowLoginPopup } = useContext(AuthContext)
  const { user, profile, loading, pendingRequests, matches } = useMentorship()
  const [stats, setStats] = useState<DashboardStats>({ activeMatches: 0, completedMentorships: 0 })

  useEffect(() => {
    if (!loading && !user) {
      // User not logged in - show login popup
      setShowLoginPopup(true)
    }
  }, [loading, user, setShowLoginPopup])

  // Only redirect to onboarding if user is logged in AND profile fetch completed with no profile
  // The profile being undefined during initial load should not trigger redirect
  useEffect(() => {
    if (!loading && user && profile === null) {
      // User logged in but confirmed no profile exists - redirect to onboarding
      router.push('/mentorship/onboarding')
    }
  }, [loading, user, profile, router])

  // Fetch dashboard stats (active and completed mentorships)
  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return
      try {
        const response = await fetch(`/api/mentorship/my-matches?uid=${user.uid}&role=${profile?.role}`)
        if (response.ok) {
          const data = await response.json()
          const activeMatches = (data.activeMatches || []).length
          const completedMentorships = (data.completedMatches || []).length
          setStats({ activeMatches, completedMentorships })
        }
      } catch (error) {
        console.error('Error fetching stats:', error)
      }
    }
    if (user && profile) {
      fetchStats()
    }
  }, [user, profile])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body text-center">
          <h2 className="card-title justify-center text-2xl">Welcome to the Mentorship Program</h2>
          <p className="text-base-content/70 mt-2">
            Please sign in with your Google account to access your dashboard.
          </p>
          <div className="card-actions justify-center mt-6">
            <button 
              className="btn btn-primary btn-lg"
              onClick={() => setShowLoginPopup(true)}
            >
              Sign In to Continue
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    )
  }

  // User has a profile - check if disabled
  if (profile.status === 'disabled') {
    return (
      <div className="space-y-6">
        {/* Disabled Notice */}
        <div className="card bg-error/10 border-2 border-error shadow-xl">
          <div className="card-body text-center">
            <div className="text-6xl mb-4">🚫</div>
            <h2 className="card-title justify-center text-2xl text-error">Account Disabled</h2>
            <p className="text-base-content/70 mt-2 max-w-lg mx-auto">
              Your mentorship profile has been disabled by an administrator. 
              You will not appear in mentor searches and cannot participate in new mentorship sessions.
            </p>
            <div className="divider"></div>
            <p className="text-sm text-base-content/60">
              If you believe this is a mistake or would like to appeal this decision, 
              please contact support or the program administrator.
            </p>
            <div className="card-actions justify-center mt-4">
              <Link href="/mentorship" className="btn btn-ghost">
                ← Back to Mentorship Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // User has a profile - show dashboard
  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex items-center gap-4">
            {user.photoURL && (
              <div className="avatar">
                <div className="w-16 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                  <img src={user.photoURL} alt={user.displayName || 'Profile'} />
                </div>
              </div>
            )}
            <div>
              <h2 className="text-2xl font-bold">Welcome back, {user.displayName}!</h2>
              <div className="badge badge-primary badge-lg mt-1">
                {profile.role === 'mentor' ? '🎯 Mentor' : '🚀 Mentee'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="stats shadow w-full bg-base-100">
        <div className="stat">
          <div className="stat-figure text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
          </div>
          <div className="stat-title">Active Matches</div>
          <div className="stat-value text-primary">{stats.activeMatches}</div>
        </div>
        
        <div className="stat">
          <div className="stat-figure text-success">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <div className="stat-title">Completed Mentorships</div>
          <div className="stat-value text-success">{stats.completedMentorships}</div>
        </div>
        
        <div className="stat">
          <div className="stat-figure text-accent">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
          </div>
          <div className="stat-title">Pending Requests</div>
          <div className="stat-value text-accent">{pendingRequests.length}</div>
        </div>
      </div>

      {/* Navigation Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        {profile.role === 'mentee' && (
          <Link href="/mentorship/browse" className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer">
            <div className="card-body">
              <h3 className="card-title">
                <span className="text-2xl">🔍</span> Browse Mentors
              </h3>
              <p className="text-base-content/70 text-sm">Find and connect with experienced mentors</p>
            </div>
          </Link>
        )}
        
        {profile.role === 'mentor' && (
          <Link href="/mentorship/requests" className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer relative">
            <div className="card-body">
              <h3 className="card-title">
                <span className="text-2xl">📬</span> Pending Requests
                {pendingRequests.length > 0 && (
                  <span className="badge badge-error badge-sm">{pendingRequests.length}</span>
                )}
              </h3>
              <p className="text-base-content/70 text-sm">Review mentee applications</p>
            </div>
            {pendingRequests.length > 0 && (
              <div className="absolute -top-2 -right-2">
                <span className="relative flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-error"></span>
                </span>
              </div>
            )}
          </Link>
        )}
        
        <Link href="/mentorship/my-matches" className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer relative">
          <div className="card-body">
            <h3 className="card-title">
              <span className="text-2xl">🤝</span> My Matches
              {matches.length > 0 && (
                <span className="badge badge-success badge-sm">{matches.length}</span>
              )}
            </h3>
            <p className="text-base-content/70 text-sm">View your active mentorship relationships</p>
          </div>
          {matches.length > 0 && (
            <div className="absolute -top-2 -right-2">
              <span className="relative flex h-4 w-4">
                <span className="relative inline-flex rounded-full h-4 w-4 bg-success"></span>
              </span>
            </div>
          )}
        </Link>
        
        <Link href="/mentorship/goals" className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer">
          <div className="card-body">
            <h3 className="card-title">
              <span className="text-2xl">🎯</span> Goals & Progress
            </h3>
            <p className="text-base-content/70 text-sm">Track your SMART objectives</p>
          </div>
        </Link>

        <Link href="/mentorship/settings" className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer">
          <div className="card-body">
            <h3 className="card-title">
              <span className="text-2xl">⚙️</span> Settings
            </h3>
            <p className="text-base-content/70 text-sm">Update your profile and preferences</p>
          </div>
        </Link>

        <Link href="/mentorship" className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer">
          <div className="card-body">
            <h3 className="card-title">
              <span className="text-2xl">🌟</span> Community Mentors
            </h3>
            <p className="text-base-content/70 text-sm">See our amazing mentor community</p>
          </div>
        </Link>
      </div>

      {/* Role-Specific Guidelines */}
      {profile.role === 'mentor' && (
        <div className="collapse collapse-arrow bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
          <input type="checkbox" defaultChecked />
          <div className="collapse-title text-xl font-medium">
            <span className="flex items-center gap-2">
              <span className="text-2xl">📚</span> Mentor Success Guide
            </span>
          </div>
          <div className="collapse-content">
            <div className="grid md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-3">
                <h4 className="font-semibold text-primary">🎯 Getting Started</h4>
                <ul className="text-sm space-y-2 text-base-content/80">
                  <li>• <strong>Set clear expectations</strong> in your first session about communication frequency and response times</li>
                  <li>• <strong>Understand their goals</strong> - ask what success looks like for them in 3-6 months</li>
                  <li>• <strong>Share your journey</strong> - your failures and learnings are as valuable as your successes</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold text-primary">💡 During Sessions</h4>
                <ul className="text-sm space-y-2 text-base-content/80">
                  <li>• <strong>Listen more than you speak</strong> - aim for 70/30 ratio in favor of your mentee</li>
                  <li>• <strong>Ask powerful questions</strong> instead of giving direct answers when possible</li>
                  <li>• <strong>Assign actionable tasks</strong> between sessions to maintain momentum</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold text-primary">📈 Tracking Progress</h4>
                <ul className="text-sm space-y-2 text-base-content/80">
                  <li>• <strong>Set SMART goals</strong> together and review them every 4-6 weeks</li>
                  <li>• <strong>Celebrate small wins</strong> - recognition boosts motivation</li>
                  <li>• <strong>Document key learnings</strong> after each session using goals tracker</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold text-primary">🚀 Best Practices</h4>
                <ul className="text-sm space-y-2 text-base-content/80">
                  <li>• <strong>Be consistent</strong> - regular sessions (even brief ones) beat sporadic long meetings</li>
                  <li>• <strong>Provide honest feedback</strong> with kindness - growth requires truth</li>
                  <li>• <strong>Know when to refer</strong> - connect them with others for topics outside your expertise</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {profile.role === 'mentee' && (
        <div className="collapse collapse-arrow bg-gradient-to-r from-secondary/10 to-secondary/5 border border-secondary/20">
          <input type="checkbox" defaultChecked />
          <div className="collapse-title text-xl font-medium">
            <span className="flex items-center gap-2">
              <span className="text-2xl">🚀</span> Mentee Success Guide
            </span>
          </div>
          <div className="collapse-content">
            <div className="grid md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-3">
                <h4 className="font-semibold text-secondary">🎯 Prepare for Sessions</h4>
                <ul className="text-sm space-y-2 text-base-content/80">
                  <li>• <strong>Come with specific questions</strong> - vague topics lead to vague advice</li>
                  <li>• <strong>Share context upfront</strong> - the more your mentor knows, the better they can help</li>
                  <li>• <strong>Set an agenda</strong> - even a simple 3-item list keeps sessions focused</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold text-secondary">💡 During Sessions</h4>
                <ul className="text-sm space-y-2 text-base-content/80">
                  <li>• <strong>Take notes</strong> - insights fade quickly without documentation</li>
                  <li>• <strong>Be vulnerable</strong> - share your real struggles, not just highlights</li>
                  <li>• <strong>Ask for examples</strong> - &quot;Can you share when you faced something similar?&quot;</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold text-secondary">📈 Between Sessions</h4>
                <ul className="text-sm space-y-2 text-base-content/80">
                  <li>• <strong>Follow through</strong> on commitments - action shows respect for their time</li>
                  <li>• <strong>Share updates proactively</strong> - brief progress messages build connection</li>
                  <li>• <strong>Apply & reflect</strong> - try their advice and report back what worked</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold text-secondary">🌟 Make It Count</h4>
                <ul className="text-sm space-y-2 text-base-content/80">
                  <li>• <strong>Be patient</strong> - meaningful growth takes time, trust the process</li>
                  <li>• <strong>Give feedback</strong> - let your mentor know what&apos;s helpful and what&apos;s not</li>
                  <li>• <strong>Pay it forward</strong> - someday you&apos;ll be the mentor, start helping peers now</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
