'use client'

import { useState, useEffect, useContext } from 'react'
import { useRouter } from 'next/navigation'
import { AuthContext } from '@/contexts/AuthContext'
import { useMentorship } from '@/contexts/MentorshipContext'
import MentorRegistrationForm from '@/components/mentorship/MentorRegistrationForm'
import MenteeRegistrationForm from '@/components/mentorship/MenteeRegistrationForm'
import Link from 'next/link'

export default function SettingsPage() {
  const router = useRouter()
  const { setShowLoginPopup } = useContext(AuthContext)
  const { user, profile, loading, refreshProfile } = useMentorship()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      setShowLoginPopup(true)
    }
  }, [loading, user, setShowLoginPopup])

  useEffect(() => {
    if (!loading && user && !profile) {
      router.push('/mentorship/onboarding')
    }
  }, [loading, user, profile, router])

  const handleSubmit = async (data: Record<string, unknown>) => {
    if (!user) return

    setIsSubmitting(true)
    setSuccess(false)

    try {
      const response = await fetch('/api/mentorship/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          ...data,
        }),
      })

      if (response.ok) {
        await refreshProfile()
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      } else {
        const error = await response.json()
        alert('Failed to update profile: ' + error.error)
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('An error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    )
  }

  if (!user || !profile) {
    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body text-center">
          <h2 className="card-title justify-center text-2xl">Access Required</h2>
          <p className="text-base-content/70 mt-2">
            Please sign in and complete your profile.
          </p>
          <div className="card-actions justify-center mt-6">
            <Link href="/mentorship" className="btn btn-primary">
              Go to Mentorship Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Convert availability back to boolean format if needed
  const mentorInitialData = profile.role === 'mentor' ? {
    expertise: profile.expertise || [],
    currentRole: profile.currentRole || '',
    bio: profile.bio || '',
    maxMentees: profile.maxMentees || 3,
    availability: profile.availability 
      ? Object.keys(profile.availability).reduce((acc, day) => ({ ...acc, [day]: true }), {})
      : {},
  } : undefined

  const menteeInitialData = profile.role === 'mentee' ? {
    education: profile.education || '',
    skillsSought: profile.skillsSought || [],
    careerGoals: profile.careerGoals || '',
    learningStyle: profile.learningStyle || 'mixed',
  } : undefined

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Profile Settings</h2>
          <p className="text-base-content/70">Update your {profile.role} profile details</p>
        </div>
        <Link href="/mentorship" className="btn btn-ghost btn-sm">
          ← Back to Dashboard
        </Link>
      </div>

      {/* Success Message */}
      {success && (
        <div className="alert alert-success">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Your profile has been updated successfully!</span>
        </div>
      )}

      {/* Form Card */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h3 className="card-title">
            {profile.role === 'mentor' ? '🎯 Mentor Profile' : '🚀 Mentee Profile'}
          </h3>
          
          <div className="divider"></div>

          {profile.role === 'mentor' ? (
            <MentorRegistrationForm
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              initialData={mentorInitialData}
              mode="edit"
            />
          ) : (
            <MenteeRegistrationForm
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              initialData={menteeInitialData}
              mode="edit"
            />
          )}
        </div>
      </div>
    </div>
  )
}
