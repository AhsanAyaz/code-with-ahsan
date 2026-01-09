'use client'

import { useContext, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthContext } from '@/contexts/AuthContext'
import { useMentorship } from '@/contexts/MentorshipContext'
import Link from 'next/link'

export default function MentorshipPage() {
  const router = useRouter()
  const { setShowLoginPopup } = useContext(AuthContext)
  const { user, profile, loading, pendingRequests, matches } = useMentorship()

  useEffect(() => {
    if (!loading && !user) {
      // User not logged in - show login popup
      setShowLoginPopup(true)
    }
  }, [loading, user, setShowLoginPopup])

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
            Please sign in with your Google account to get started.
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

  // User is logged in but has no profile - redirect to onboarding
  if (!profile) {
    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-2xl">Complete Your Profile</h2>
          <p className="text-base-content/70 mt-2">
            Welcome, <span className="font-semibold">{user.displayName}</span>! 
            Let's set up your mentorship profile to connect you with the right people.
          </p>
          
          <div className="grid md:grid-cols-2 gap-6 mt-8">
            {/* Mentor Card */}
            <div className="card bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
              <div className="card-body">
                <div className="text-4xl mb-4">🎯</div>
                <h3 className="card-title">I want to be a Mentor</h3>
                <p className="text-base-content/70 text-sm">
                  Share your expertise and help others grow in their careers. 
                  Guide mentees through challenges and celebrate their wins.
                </p>
                <div className="card-actions mt-4">
                  <Link href="/mentorship/onboarding?role=mentor" className="btn btn-primary w-full">
                    Register as Mentor
                  </Link>
                </div>
              </div>
            </div>

            {/* Mentee Card */}
            <div className="card bg-gradient-to-br from-secondary/10 to-secondary/5 border border-secondary/20">
              <div className="card-body">
                <div className="text-4xl mb-4">🚀</div>
                <h3 className="card-title">I want to be a Mentee</h3>
                <p className="text-base-content/70 text-sm">
                  Get guidance from experienced professionals. 
                  Accelerate your learning and achieve your career goals faster.
                </p>
                <div className="card-actions mt-4">
                  <Link href="/mentorship/onboarding?role=mentee" className="btn btn-secondary w-full">
                    Register as Mentee
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // User has a profile - show dashboard based on role
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
          <div className="stat-value text-primary">0</div>
        </div>
        
        <div className="stat">
          <div className="stat-figure text-secondary">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
            </svg>
          </div>
          <div className="stat-title">Goals Completed</div>
          <div className="stat-value text-secondary">0</div>
        </div>
        
        <div className="stat">
          <div className="stat-figure text-accent">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
          </div>
          <div className="stat-title">Sessions</div>
          <div className="stat-value text-accent">0</div>
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
      </div>
    </div>
  )
}
