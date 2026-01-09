'use client'

import { useState } from 'react'

interface MenteeRegistrationFormProps {
  onSubmit: (data: Record<string, unknown>) => Promise<void>
  isSubmitting: boolean
}

const SKILLS_OPTIONS = [
  'JavaScript',
  'TypeScript',
  'React',
  'Angular',
  'Vue.js',
  'Node.js',
  'Python',
  'Java',
  'Go',
  'Rust',
  'AWS',
  'Docker',
  'Kubernetes',
  'System Design',
  'Data Structures',
  'Algorithms',
  'SQL',
  'MongoDB',
]

const LEARNING_STYLES = [
  { value: 'self-study', label: 'Self-Study', description: 'I prefer learning on my own with occasional guidance' },
  { value: 'guided', label: 'Guided Learning', description: 'I prefer structured sessions with regular check-ins' },
  { value: 'mixed', label: 'Mixed Approach', description: 'A combination of both self-study and guided sessions' },
]

export default function MenteeRegistrationForm({ onSubmit, isSubmitting }: MenteeRegistrationFormProps) {
  const [education, setEducation] = useState('')
  const [skillsSought, setSkillsSought] = useState<string[]>([])
  const [careerGoals, setCareerGoals] = useState('')
  const [learningStyle, setLearningStyle] = useState<'self-study' | 'guided' | 'mixed'>('mixed')

  const toggleSkill = (skill: string) => {
    setSkillsSought(prev => 
      prev.includes(skill) 
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (skillsSought.length === 0) {
      alert('Please select at least one skill you want to learn')
      return
    }
    
    if (!careerGoals.trim()) {
      alert('Please describe your career goals')
      return
    }

    await onSubmit({
      education,
      skillsSought,
      careerGoals,
      learningStyle,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Education Background */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-semibold">Educational Background</span>
        </label>
        <input
          type="text"
          placeholder="e.g., BS in Computer Science, Self-taught Developer, Bootcamp Graduate"
          className="input input-bordered w-full"
          value={education}
          onChange={(e) => setEducation(e.target.value)}
        />
        <label className="label">
          <span className="label-text-alt text-base-content/60">This helps mentors understand your starting point</span>
        </label>
      </div>

      {/* Skills Sought */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-semibold">Skills You Want to Learn *</span>
          <span className="label-text-alt">{skillsSought.length} selected</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {SKILLS_OPTIONS.map(skill => (
            <button
              key={skill}
              type="button"
              onClick={() => toggleSkill(skill)}
              className={`btn btn-sm ${skillsSought.includes(skill) ? 'btn-secondary' : 'btn-outline'}`}
            >
              {skill}
            </button>
          ))}
        </div>
        <label className="label">
          <span className="label-text-alt text-base-content/60">Select skills you'd like guidance on</span>
        </label>
      </div>

      {/* Career Goals */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-semibold">Career Goals *</span>
          <span className="label-text-alt text-base-content/60">{careerGoals.length}/500 characters</span>
        </label>
        <textarea
          placeholder="Describe where you want to be in your career. What role are you aiming for? What do you want to achieve?"
          className="textarea textarea-bordered w-full h-32"
          value={careerGoals}
          onChange={(e) => setCareerGoals(e.target.value)}
          required
          maxLength={500}
        />
      </div>

      {/* Learning Style */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-semibold">Preferred Learning Style</span>
        </label>
        <div className="space-y-3">
          {LEARNING_STYLES.map(style => (
            <label
              key={style.value}
              className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all ${
                learningStyle === style.value 
                  ? 'border-primary bg-primary/5' 
                  : 'border-base-300 hover:border-primary/50'
              }`}
            >
              <input
                type="radio"
                name="learningStyle"
                value={style.value}
                checked={learningStyle === style.value}
                onChange={(e) => setLearningStyle(e.target.value as typeof learningStyle)}
                className="radio radio-primary mt-1"
              />
              <div>
                <div className="font-semibold">{style.label}</div>
                <div className="text-sm text-base-content/60">{style.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Submit Button */}
      <div className="pt-4">
        <button 
          type="submit" 
          className="btn btn-secondary btn-lg w-full"
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
