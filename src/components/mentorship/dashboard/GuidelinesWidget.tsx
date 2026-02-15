interface GuidelinesWidgetProps {
  role: "mentor" | "mentee";
}

export default function GuidelinesWidget({ role }: GuidelinesWidgetProps) {
  if (role === "mentor") {
    return (
      <div className="collapse collapse-arrow bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 mt-8">
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
                <li>
                  • <strong>Set clear expectations</strong> in your first session
                  about communication frequency and response times
                </li>
                <li>
                  • <strong>Understand their goals</strong> - ask what success
                  looks like for them in 3-6 months
                </li>
                <li>
                  • <strong>Share your journey</strong> - your failures and
                  learnings are as valuable as your successes
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold text-primary">💡 During Sessions</h4>
              <ul className="text-sm space-y-2 text-base-content/80">
                <li>
                  • <strong>Listen more than you speak</strong> - aim for 70/30
                  ratio in favor of your mentee
                </li>
                <li>
                  • <strong>Ask powerful questions</strong> instead of giving
                  direct answers when possible
                </li>
                <li>
                  • <strong>Assign actionable tasks</strong> between sessions to
                  maintain momentum
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold text-primary">📈 Tracking Progress</h4>
              <ul className="text-sm space-y-2 text-base-content/80">
                <li>
                  • <strong>Set SMART goals</strong> together and review them
                  every 4-6 weeks
                </li>
                <li>
                  • <strong>Celebrate small wins</strong> - recognition boosts
                  motivation
                </li>
                <li>
                  • <strong>Document key learnings</strong> after each session
                  using goals tracker
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold text-primary">🚀 Best Practices</h4>
              <ul className="text-sm space-y-2 text-base-content/80">
                <li>
                  • <strong>Be consistent</strong> - regular sessions (even brief
                  ones) beat sporadic long meetings
                </li>
                <li>
                  • <strong>Provide honest feedback</strong> with kindness -
                  growth requires truth
                </li>
                <li>
                  • <strong>Know when to refer</strong> - connect them with others
                  for topics outside your expertise
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="collapse collapse-arrow bg-gradient-to-r from-secondary/10 to-secondary/5 border border-secondary/20 mt-8">
      <input type="checkbox" defaultChecked />
      <div className="collapse-title text-xl font-medium">
        <span className="flex items-center gap-2">
          <span className="text-2xl">🚀</span> Mentee Success Guide
        </span>
      </div>
      <div className="collapse-content">
        <div className="grid md:grid-cols-2 gap-4 pt-2">
          <div className="space-y-3">
            <h4 className="font-semibold text-secondary">
              🎯 Prepare for Sessions
            </h4>
            <ul className="text-sm space-y-2 text-base-content/80">
              <li>
                • <strong>Come with specific questions</strong> - vague topics
                lead to vague advice
              </li>
              <li>
                • <strong>Share context upfront</strong> - the more your mentor
                knows, the better they can help
              </li>
              <li>
                • <strong>Set an agenda</strong> - even a simple 3-item list keeps
                sessions focused
              </li>
            </ul>
          </div>
          <div className="space-y-3">
            <h4 className="font-semibold text-secondary">💡 During Sessions</h4>
            <ul className="text-sm space-y-2 text-base-content/80">
              <li>
                • <strong>Take notes</strong> - insights fade quickly without
                documentation
              </li>
              <li>
                • <strong>Be vulnerable</strong> - share your real struggles, not
                just highlights
              </li>
              <li>
                • <strong>Ask for examples</strong> - &quot;Can you share when you
                faced something similar?&quot;
              </li>
            </ul>
          </div>
          <div className="space-y-3">
            <h4 className="font-semibold text-secondary">📈 Between Sessions</h4>
            <ul className="text-sm space-y-2 text-base-content/80">
              <li>
                • <strong>Follow through</strong> on commitments - action shows
                respect for their time
              </li>
              <li>
                • <strong>Share updates proactively</strong> - brief progress
                messages build connection
              </li>
              <li>
                • <strong>Apply & reflect</strong> - try their advice and report
                back what worked
              </li>
            </ul>
          </div>
          <div className="space-y-3">
            <h4 className="font-semibold text-secondary">🌟 Make It Count</h4>
            <ul className="text-sm space-y-2 text-base-content/80">
              <li>
                • <strong>Be patient</strong> - meaningful growth takes time,
                trust the process
              </li>
              <li>
                • <strong>Give feedback</strong> - let your mentor know what&apos;s
                helpful and what&apos;s not
              </li>
              <li>
                • <strong>Pay it forward</strong> - someday you&apos;ll be the
                mentor, start helping peers now
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
