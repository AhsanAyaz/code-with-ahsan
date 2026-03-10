import { UserPlus, Users, TrendingUp } from "lucide-react";

const steps = [
  {
    number: 1,
    title: "Sign Up",
    description:
      "Register as a mentor or mentee. Describe your expertise or define your learning goals to get started.",
    icon: UserPlus,
  },
  {
    number: 2,
    title: "Get Matched",
    description:
      "Browse mentor profiles, find the right fit for your goals, and send a match request.",
    icon: Users,
  },
  {
    number: 3,
    title: "Grow Together",
    description:
      "Meet regularly, set clear goals, track your progress, and level up your career together.",
    icon: TrendingUp,
  },
];

export default function HowItWorks() {
  return (
    <section className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl md:text-3xl font-bold">How It Works</h2>
        <p className="text-base-content/70 mt-2 max-w-xl mx-auto">
          Getting started with mentorship is simple. Three steps to a
          structured, goal-driven mentoring relationship.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {steps.map((step) => (
          <div key={step.number} className="card bg-base-200">
            <div className="card-body items-center text-center gap-3">
              <span className="badge badge-primary badge-lg">
                Step {step.number}
              </span>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <step.icon className="w-6 h-6" />
              </div>
              <h3 className="card-title text-lg">{step.title}</h3>
              <p className="text-base-content/70 text-sm">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
