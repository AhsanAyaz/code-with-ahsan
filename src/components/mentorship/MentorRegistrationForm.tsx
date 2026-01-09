'use client'

import { useState } from 'react'

interface MentorRegistrationFormProps {
  onSubmit: (data: Record<string, unknown>) => Promise<void>
  isSubmitting: boolean
}

const EXPERTISE_OPTIONS = [
  'Web Development',
  'Mobile Development',
  'Backend Development',
  'DevOps & Cloud',
  'Data Science',
  'Machine Learning',
  'UI/UX Design',
  'Product Management',
  'Career Growth',
  'Interview Prep',
  'System Design',
  'Leadership',
]

const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

export default function MentorRegistrationForm({ onSubmit, isSubmitting }: MentorRegistrationFormProps) {
  const [expertise, setExpertise] = useState<string[]>([])
  const [currentRole, setCurrentRole] = useState('')
  const [bio, setBio] = useState('')
  const [maxMentees, setMaxMentees] = useState(3)
  const [availability, setAvailability] = useState<Record<string, boolean>>({})

  const toggleExpertise = (skill: string) => {
    setExpertise(prev => 
      prev.includes(skill) 
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    )
  }

  const toggleDay = (day: string) => {
    setAvailability(prev => ({
      ...prev,
      [day]: !prev[day]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (expertise.length === 0) {
      alert('Please select at least one area of expertise')
      return
    }
    
    if (!currentRole.trim()) {
      alert('Please enter your current role')
      return
    }

    const availableDays = Object.entries(availability)
      .filter(([, isAvailable]) => isAvailable)
      .reduce((acc, [day]) => {
        acc[day] = ['flexible']
        return acc
      }, {} as Record<string, string[]>)

    await onSubmit({
      expertise,
      currentRole,
      bio,
      maxMentees,
      availability: availableDays,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Current Role */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-semibold">Current Role / Position *</span>
        </label>
        <input
          type="text"
          placeholder="e.g., Senior Software Engineer at Google"
          className="input input-bordered w-full"
          value={currentRole}
          onChange={(e) => setCurrentRole(e.target.value)}
          required
        />
        <label className="label">
          <span className="label-text-alt text-base-content/60">This helps mentees understand your background</span>
        </label>
      </div>

      {/* Areas of Expertise */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-semibold">Areas of Expertise *</span>
          <span className="label-text-alt">{expertise.length} selected</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {EXPERTISE_OPTIONS.map(skill => (
            <button
              key={skill}
              type="button"
              onClick={() => toggleExpertise(skill)}
              className={`btn btn-sm ${expertise.includes(skill) ? 'btn-primary' : 'btn-outline'}`}
            >
              {skill}
            </button>
          ))}
        </div>
      </div>

      {/* Bio */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-semibold">Short Bio</span>
          <span className="label-text-alt text-base-content/60">{bio.length}/500 characters</span>
        </label>
        <textarea
          placeholder="Tell potential mentees about yourself, your journey, and what you can help with..."
          className="textarea textarea-bordered w-full h-32"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={500}
        />
      </div>

      {/* Max Mentees */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-semibold">Maximum Mentees at a Time</span>
          <span className="label-text-alt font-bold text-primary">{maxMentees}</span>
        </label>
        <input
          type="range"
          min={1}
          max={10}
          value={maxMentees}
          onChange={(e) => setMaxMentees(Number(e.target.value))}
          className="range range-primary w-full"
        />
        <div className="w-full flex justify-between text-xs px-2 mt-1">
          <span>1</span>
          <span>5</span>
          <span>10</span>
        </div>
        <p className="text-xs text-base-content/60 mt-2">Manage your availability by limiting active mentees</p>
      </div>

      {/* Availability */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-semibold">Available Days</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {DAYS_OF_WEEK.map(day => (
            <button
              key={day}
              type="button"
              onClick={() => toggleDay(day)}
              className={`btn btn-sm capitalize ${availability[day] ? 'btn-secondary' : 'btn-outline'}`}
            >
              {day.slice(0, 3)}
            </button>
          ))}
        </div>
        <label className="label">
          <span className="label-text-alt text-base-content/60">Select days you're generally available for mentorship sessions</span>
        </label>
      </div>

      {/* Submit Button */}
      <div className="pt-4">
        <button 
          type="submit" 
          className="btn btn-primary btn-lg w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <span className="loading loading-spinner"></span>
              Creating Profile...
            </>
          ) : (
            'Complete Registration'
          )}
        </button>
      </div>
    </form>
  )
}
