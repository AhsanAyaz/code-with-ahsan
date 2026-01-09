// Shared session templates for scheduling and Learning Hub
export interface SessionTemplate {
  id: string
  title: string
  icon: string
  duration: string
  durationMinutes: number
  description: string
  agenda: string[]
}

export const SESSION_TEMPLATES: SessionTemplate[] = [
  {
    id: 'cv-review',
    title: 'CV/Resume Review',
    icon: '📄',
    duration: '30-45 min',
    durationMinutes: 45,
    description: 'Review and improve your resume with actionable feedback.',
    agenda: [
      'Share current resume/CV',
      'Discuss target roles and industries',
      'Review format and structure',
      'Optimize content and highlights',
      'Set action items for improvements',
    ],
  },
  {
    id: 'mock-interview',
    title: 'Mock Interview',
    icon: '🎯',
    duration: '45-60 min',
    durationMinutes: 60,
    description: 'Practice common interview questions and receive feedback.',
    agenda: [
      'Warm-up: Tell me about yourself',
      'Technical/behavioral questions',
      'Real-time feedback on answers',
      'Body language and presentation tips',
      'Q&A and final advice',
    ],
  },
  {
    id: 'career-planning',
    title: 'Career Path Planning',
    icon: '🗺️',
    duration: '45 min',
    durationMinutes: 45,
    description: 'Map out your career trajectory and identify growth areas.',
    agenda: [
      'Discuss current role and experience',
      'Define short and long-term goals',
      'Identify skill gaps',
      'Explore potential paths',
      'Create action plan with milestones',
    ],
  },
  {
    id: 'technical-deep-dive',
    title: 'Technical Deep Dive',
    icon: '💻',
    duration: '60 min',
    durationMinutes: 60,
    description: 'Explore a technical topic or review code together.',
    agenda: [
      'Define the topic or share code',
      'Walk through concepts/implementation',
      'Q&A and clarifications',
      'Best practices discussion',
      'Resources for further learning',
    ],
  },
  {
    id: 'project-kickoff',
    title: 'Project Kickoff',
    icon: '🚀',
    duration: '30 min',
    durationMinutes: 30,
    description: 'Plan a new learning project or side project together.',
    agenda: [
      'Brainstorm project ideas',
      'Define scope and MVP',
      'Choose tech stack',
      'Set milestones and deadlines',
      'Identify potential blockers',
    ],
  },
  {
    id: 'goal-checkin',
    title: 'Goal Check-in',
    icon: '✅',
    duration: '20-30 min',
    durationMinutes: 30,
    description: 'Review progress on goals and adjust plans.',
    agenda: [
      'Review current goals',
      'Celebrate wins',
      'Discuss challenges',
      'Adjust timelines if needed',
      'Set focus for next period',
    ],
  },
]

export const DISCUSSION_PROMPTS = [
  "What's one thing you learned this week that surprised you?",
  "What's your biggest challenge right now?",
  "If you could master one skill instantly, what would it be?",
  "What does success look like to you in 5 years?",
  "What's a recent failure and what did you learn from it?",
  "Who inspires you in your field and why?",
  "What's one thing holding you back from reaching your goals?",
  "Describe your ideal work environment.",
]

// Generate Google Calendar URL with optional Meet link
export function generateGoogleCalendarUrl({
  title,
  description,
  startTime,
  durationMinutes,
  attendeeEmail,
}: {
  title: string
  description: string
  startTime: Date
  durationMinutes: number
  attendeeEmail?: string
}): string {
  const endTime = new Date(startTime.getTime() + durationMinutes * 60000)
  
  // Format date in local time (YYYYMMDDTHHmmss) - NOT UTC
  // Google Calendar interprets dates without 'Z' suffix as local time
  const formatLocalDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return `${year}${month}${day}T${hours}${minutes}${seconds}`
  }

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    details: description,
    dates: `${formatLocalDate(startTime)}/${formatLocalDate(endTime)}`,
    // Add Google Meet by default
    add: attendeeEmail || '',
    // Request conferencing (adds Google Meet)
    crm: 'AVAILABLE',
    // Google Meet shortcut
    src: 'calendar',
  })

  // Add attendee if provided
  if (attendeeEmail) {
    params.append('add', attendeeEmail)
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}
