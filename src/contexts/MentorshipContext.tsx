'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { getAuth, onAuthStateChanged, User } from 'firebase/auth'
import { getApp } from 'firebase/app'

export type MentorshipRole = 'mentor' | 'mentee' | null

export interface MentorshipProfile {
  uid: string
  role: MentorshipRole
  displayName: string
  email: string
  photoURL: string
  createdAt: Date
  updatedAt: Date
  // Approval status
  status?: 'pending' | 'accepted' | 'declined' | 'disabled'
  // Mentor-specific
  expertise?: string[]
  currentRole?: string
  bio?: string
  resumeURL?: string
  cvUrl?: string  // CV/Resume link for scrutiny
  majorProjects?: string  // Description of major projects and role
  availability?: Record<string, string[]>
  maxMentees?: number
  isPublic?: boolean
  // Mentee-specific
  education?: string
  skillsSought?: string[]
  careerGoals?: string
  learningStyle?: 'self-study' | 'guided' | 'mixed'
}

export interface MentorshipMatch {
  id: string
  mentorId: string
  menteeId: string
  status: 'pending' | 'active' | 'declined' | 'completed'
  requestedAt: Date
  approvedAt?: Date
  lastContactAt?: Date
  matchScore?: number
}

interface MentorshipContextType {
  user: User | null
  profile: MentorshipProfile | null
  loading: boolean
  matches: MentorshipMatch[]
  pendingRequests: MentorshipMatch[]
  refreshProfile: () => Promise<void>
  refreshMatches: () => Promise<void>
}

const MentorshipContext = createContext<MentorshipContextType | undefined>(undefined)

export function useMentorship() {
  const context = useContext(MentorshipContext)
  if (!context) {
    throw new Error('useMentorship must be used within a MentorshipProvider')
  }
  return context
}

interface MentorshipProviderProps {
  children: ReactNode
}

export function MentorshipProvider({ children }: MentorshipProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<MentorshipProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [matches, setMatches] = useState<MentorshipMatch[]>([])
  const [pendingRequests, setPendingRequests] = useState<MentorshipMatch[]>([])

  const refreshProfile = async () => {
    if (!user) {
      setProfile(null)
      return
    }
    try {
      const response = await fetch(`/api/mentorship/profile?uid=${user.uid}`)
      if (response.ok) {
        const data = await response.json()
        setProfile(data.profile)
      } else {
        setProfile(null)
      }
    } catch (error) {
      console.error('Error fetching mentorship profile:', error)
      setProfile(null)
    }
  }

  const refreshMatches = async () => {
    if (!user || !profile) {
      setMatches([])
      setPendingRequests([])
      return
    }
    try {
      const response = await fetch(`/api/mentorship/match?uid=${user.uid}&role=${profile.role}`)
      if (response.ok) {
        const data = await response.json()
        setMatches(data.matches || [])
        setPendingRequests(data.pendingRequests || [])
      }
    } catch (error) {
      console.error('Error fetching matches:', error)
    }
  }

  useEffect(() => {
    const auth = getAuth(getApp())
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (user) {
      refreshProfile()
    } else {
      setProfile(null)
      setMatches([])
      setPendingRequests([])
    }
  }, [user])

  useEffect(() => {
    if (profile) {
      refreshMatches()
    }
  }, [profile])

  return (
    <MentorshipContext.Provider
      value={{
        user,
        profile,
        loading,
        matches,
        pendingRequests,
        refreshProfile,
        refreshMatches,
      }}
    >
      {children}
    </MentorshipContext.Provider>
  )
}
