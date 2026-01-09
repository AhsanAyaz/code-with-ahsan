'use client'

import { MentorshipProfile } from '@/contexts/MentorshipContext'

type RequestStatus = 'none' | 'pending' | 'declined' | 'active'

interface MentorCardProps {
  mentor: MentorshipProfile
  onRequestMatch: (mentorId: string) => Promise<void>
  isRequesting: boolean
  requestStatus: RequestStatus
}

export default function MentorCard({ mentor, onRequestMatch, isRequesting, requestStatus }: MentorCardProps) {
  // Check if mentor is at capacity (these fields come from API)
  const isAtCapacity = (mentor as MentorshipProfile & { isAtCapacity?: boolean }).isAtCapacity
  const activeMenteeCount = (mentor as MentorshipProfile & { activeMenteeCount?: number }).activeMenteeCount || 0

  const renderActionButton = () => {
    switch (requestStatus) {
      case 'pending':
        return (
          <button className="btn btn-warning btn-block" disabled>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Request Pending
          </button>
        )
      case 'declined':
        return (
          <button className="btn btn-error btn-outline btn-block" disabled>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Request Declined
          </button>
        )
      case 'active':
        return (
          <button className="btn btn-success btn-block" disabled>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Already Matched
          </button>
        )
      default:
        // Check if mentor is at capacity
        if (isAtCapacity) {
          return (
            <div className="space-y-2">
              <button className="btn btn-ghost btn-block" disabled>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                At Capacity
              </button>
              <p className="text-xs text-base-content/50 text-center">
                Mentor has {activeMenteeCount}/{mentor.maxMentees || 3} mentees
              </p>
            </div>
          )
        }
        return (
          <button 
            className="btn btn-primary btn-block"
            onClick={() => onRequestMatch(mentor.uid)}
            disabled={isRequesting}
          >
            {isRequesting ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                Sending...
              </>
            ) : (
              <>Request Match</>
            )}
          </button>
        )
    }
  }

  return (
    <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
      <div className="card-body">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="avatar">
            <div className="w-16 h-16 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
              {mentor.photoURL ? (
                <img src={mentor.photoURL} alt={mentor.displayName || 'Mentor'} />
              ) : (
                <div className="bg-primary text-primary-content flex items-center justify-center text-2xl font-bold">
                  {mentor.displayName?.charAt(0) || '?'}
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="card-title text-lg truncate">{mentor.displayName}</h3>
            <p className="text-sm text-base-content/70 truncate">{mentor.currentRole}</p>
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
          <p className="text-sm text-base-content/70 mt-3 line-clamp-3">
            {mentor.bio}
          </p>
        )}

        {/* Availability & Capacity */}
        <div className="flex items-center gap-4 mt-4 text-sm text-base-content/60">
          {mentor.availability && Object.keys(mentor.availability).length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="capitalize">
                {Object.keys(mentor.availability).map(d => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(', ')}
              </span>
            </div>
          )}
          {mentor.maxMentees && (
            <div className="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Up to {mentor.maxMentees} mentees</span>
            </div>
          )}
        </div>

        {/* Action */}
        <div className="card-actions mt-4">
          {renderActionButton()}
        </div>
      </div>
    </div>
  )
}
