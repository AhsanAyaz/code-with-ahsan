'use client'

import { useContext, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthContext } from '@/contexts/AuthContext'
import { useMentorship } from '@/contexts/MentorshipContext'
import Link from 'next/link'

interface PublicMentor {
  uid: string
  displayName: string
  photoURL?: string
  currentRole?: string
  expertise?: string[]
  bio?: string
  activeMenteeCount: number
  completedMentorships: number
  maxMentees: number
  avgRating?: number
  ratingCount?: number
  availability?: Record<string, string[]>
}

export default function MentorshipPage() {
  const router = useRouter()
  const { setShowLoginPopup } = useContext(AuthContext)
  const { user, profile, loading } = useMentorship()
  const [mentors, setMentors] = useState<PublicMentor[]>([])
  const [loadingMentors, setLoadingMentors] = useState(true)
  const [filter, setFilter] = useState('')
  const [pendingRedirect, setPendingRedirect] = useState<'mentor' | 'mentee' | null>(null)

  // Fetch public mentors
  useEffect(() => {
    const fetchMentors = async () => {
      try {
        const response = await fetch('/api/mentorship/mentors?public=true')
        if (response.ok) {
          const data = await response.json()
          setMentors(data.mentors || [])
        }
      } catch (error) {
        console.error('Error fetching mentors:', error)
      } finally {
        setLoadingMentors(false)
      }
    }

    fetchMentors()
  }, [])

  // Handle redirect after login
  useEffect(() => {
    if (!loading && user && pendingRedirect) {
      router.push(`/mentorship/onboarding?role=${pendingRedirect}`)
      setPendingRedirect(null)
    }
  }, [loading, user, pendingRedirect, router])

  const handleRoleClick = (role: 'mentor' | 'mentee') => {
    if (!user) {
      // Store pending redirect and show login
      setPendingRedirect(role)
      setShowLoginPopup(true)
    } else if (!profile) {
      // User logged in but no profile - go to onboarding
      router.push(`/mentorship/onboarding?role=${role}`)
    }
    // If user has profile, they should see the dashboard button instead
  }

  const filteredMentors = filter
    ? mentors.filter(m => 
        m.expertise?.some(e => e.toLowerCase().includes(filter.toLowerCase())) ||
        m.displayName?.toLowerCase().includes(filter.toLowerCase()) ||
        m.currentRole?.toLowerCase().includes(filter.toLowerCase())
      )
    : mentors

  return (
    <div className="space-y-8">
      {/* Hero Section with CTAs */}
      <div className="card bg-gradient-to-r from-primary to-secondary text-primary-content">
        <div className="card-body text-center py-10">
          <h2 className="text-3xl md:text-4xl font-bold">Join Our Mentorship Community</h2>
          <p className="opacity-90 max-w-2xl mx-auto mt-2">
            Connect with experienced professionals or share your expertise to help others grow. 
            Our mentorship program is designed to accelerate career development through meaningful connections.
          </p>
          
          <div className="card-actions justify-center mt-6 gap-4 flex-wrap">
            {loading ? (
              <span className="loading loading-spinner loading-md"></span>
            ) : profile ? (
              // User has profile - show dashboard button
              <Link href="/mentorship/dashboard" className="btn btn-lg bg-white/20 hover:bg-white/30 border-none">
                <span className="text-xl">📊</span> Go to Dashboard
              </Link>
            ) : (
              // No profile - show role selection buttons
              <>
                <button
                  onClick={() => handleRoleClick('mentor')}
                  className="btn btn-lg bg-white/20 hover:bg-white/30 border-none"
                >
                  <span className="text-xl">🎯</span> Become a Mentor
                </button>
                <button
                  onClick={() => handleRoleClick('mentee')}
                  className="btn btn-lg bg-white/20 hover:bg-white/30 border-none"
                >
                  <span className="text-xl">🚀</span> Be a Mentee
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats Banner */}
      <div className="stats shadow w-full bg-gradient-to-r from-primary/10 to-secondary/10">
        <div className="stat">
          <div className="stat-title">Active Mentors</div>
          <div className="stat-value text-primary">{mentors.length}</div>
          <div className="stat-desc">Ready to help</div>
        </div>
        <div className="stat">
          <div className="stat-title">Active Mentorships</div>
          <div className="stat-value text-secondary">
            {mentors.reduce((sum, m) => sum + m.activeMenteeCount, 0)}
          </div>
          <div className="stat-desc">Ongoing relationships</div>
        </div>
        <div className="stat">
          <div className="stat-title">Mentorships Completed</div>
          <div className="stat-value text-accent">
            {mentors.reduce((sum, m) => sum + m.completedMentorships, 0)}
          </div>
          <div className="stat-desc">Success stories</div>
        </div>
      </div>

      {/* Community Mentors Section */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold">
              <span className="text-primary">🌟</span> Community Mentors
            </h3>
            <p className="text-base-content/70 text-sm">
              Meet the amazing professionals who volunteer their time to guide and support others.
            </p>
          </div>
          
          {/* Search/Filter */}
          <div className="form-control w-full md:w-80">
            <input
              type="text"
              placeholder="Search by name, role, or expertise..."
              className="input input-bordered w-full"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
        </div>

        {/* Mentors Grid */}
        {loadingMentors ? (
          <div className="flex justify-center items-center py-12">
            <span className="loading loading-spinner loading-lg text-primary"></span>
          </div>
        ) : filteredMentors.length === 0 ? (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body text-center py-12">
              <div className="text-5xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold">No mentors found</h3>
              <p className="text-base-content/70">
                {filter ? 'Try adjusting your search terms' : 'Be the first to become a public mentor!'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMentors.map(mentor => (
              <div key={mentor.uid} className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all">
                <div className="card-body">
                  {/* Header with Avatar */}
                  <div className="flex items-start gap-4">
                    <div className="avatar">
                      <div className="w-16 h-16 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                        {mentor.photoURL ? (
                          <img src={mentor.photoURL} alt={mentor.displayName || 'Mentor'} />
                        ) : (
                          <div className="bg-primary text-primary-content flex items-center justify-center text-2xl font-bold w-full h-full">
                            {mentor.displayName?.charAt(0) || '?'}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="card-title text-lg">{mentor.displayName}</h3>
                      <p className="text-sm text-base-content/70 truncate">{mentor.currentRole}</p>
                      {/* Star Rating */}
                      {(mentor.ratingCount ?? 0) > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <svg
                                key={star}
                                className={`w-4 h-4 ${star <= (mentor.avgRating ?? 0) ? 'text-yellow-400' : 'text-base-content/20'}`}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </div>
                          <span className="text-xs text-base-content/60">
                            {mentor.avgRating} ({mentor.ratingCount})
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expertise Tags */}
                  {mentor.expertise && mentor.expertise.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {mentor.expertise.slice(0, 4).map(skill => (
                        <span key={skill} className="badge badge-primary badge-sm">
                          {skill}
                        </span>
                      ))}
                      {mentor.expertise.length > 4 && (
                        <span className="badge badge-ghost badge-sm">
                          +{mentor.expertise.length - 4}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Bio */}
                  {mentor.bio && (
                    <p className="text-sm text-base-content/70 mt-3 line-clamp-2">
                      {mentor.bio}
                    </p>
                  )}

                  {/* Stats */}
                  <div className="flex items-center gap-4 mt-4 pt-4 border-t border-base-200">
                    <div className="text-center flex-1">
                      <div className="text-lg font-bold text-primary">{mentor.activeMenteeCount}</div>
                      <div className="text-xs text-base-content/60">Active</div>
                    </div>
                    <div className="text-center flex-1">
                      <div className="text-lg font-bold text-secondary">{mentor.completedMentorships}</div>
                      <div className="text-xs text-base-content/60">Completed</div>
                    </div>
                    <div className="text-center flex-1">
                      <div className="text-lg font-bold text-accent">{mentor.maxMentees}</div>
                      <div className="text-xs text-base-content/60">Max</div>
                    </div>
                  </div>

                  {/* Availability */}
                  {mentor.availability && Object.keys(mentor.availability).length > 0 && (
                    <div className="flex items-center gap-1 mt-3 text-xs text-base-content/60">
                      <span>📅</span>
                      <span className="capitalize">
                        {Object.keys(mentor.availability).map(d => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
