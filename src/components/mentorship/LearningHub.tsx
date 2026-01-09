'use client'

import { SESSION_TEMPLATES, DISCUSSION_PROMPTS } from '@/lib/mentorship-templates'

export default function LearningHub() {
  const randomPrompt = DISCUSSION_PROMPTS[Math.floor(Math.random() * DISCUSSION_PROMPTS.length)]

  return (
    <div className="space-y-6">
      {/* Discussion Prompt */}
      <div className="card bg-gradient-to-r from-primary/10 to-secondary/10">
        <div className="card-body">
          <h3 className="text-sm font-semibold text-base-content/60">💡 Discussion Starter</h3>
          <p className="text-lg font-medium italic">&quot;{randomPrompt}&quot;</p>
        </div>
      </div>

      {/* Session Templates */}
      <div>
        <h3 className="text-lg font-bold mb-4">Session Templates</h3>
        <p className="text-sm text-base-content/60 mb-4">
          Use these pre-built agendas to structure your mentorship sessions effectively.
        </p>
        
        <div className="grid md:grid-cols-2 gap-4">
          {SESSION_TEMPLATES.map((template) => (
            <div key={template.id} className="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow">
              <div className="card-body p-4">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{template.icon}</span>
                  <div className="flex-1">
                    <h4 className="font-bold">{template.title}</h4>
                    <div className="text-xs text-base-content/60">{template.duration}</div>
                    <p className="text-sm text-base-content/70 mt-1">{template.description}</p>
                  </div>
                </div>
                
                <div className="collapse collapse-arrow bg-base-200 mt-3">
                  <input type="checkbox" />
                  <div className="collapse-title text-sm font-medium py-2">
                    View Agenda
                  </div>
                  <div className="collapse-content">
                    <ol className="list-decimal list-inside text-sm space-y-1">
                      {template.agenda.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Tips */}
      <div className="card bg-base-200">
        <div className="card-body">
          <h3 className="card-title text-lg">📚 Mentorship Best Practices</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-success">✓</span>
              <span>Come prepared with specific questions or topics</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-success">✓</span>
              <span>Take notes during sessions for future reference</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-success">✓</span>
              <span>Follow up on action items before the next meeting</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-success">✓</span>
              <span>Be open about challenges - this is a safe space</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-success">✓</span>
              <span>Celebrate small wins along the way</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
