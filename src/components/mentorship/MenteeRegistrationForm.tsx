"use client";

import { useState } from "react";

interface MenteeRegistrationFormProps {
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  isSubmitting: boolean;
  initialData?: {
    discordUsername?: string;
    education?: string;
    skillsSought?: string[];
    careerGoals?: string;
    learningStyle?: "self-study" | "guided" | "mixed";
  };
  mode?: "create" | "edit";
}

const SKILLS_OPTIONS = [
  "JavaScript",
  "TypeScript",
  "React",
  "Angular",
  "Vue.js",
  "Node.js",
  "Python",
  "Java",
  "Go",
  "Rust",
  "AWS",
  "Docker",
  "Kubernetes",
  "System Design",
  "Data Structures",
  "Algorithms",
  "SQL",
  "MongoDB",
];

const LEARNING_STYLES = [
  {
    value: "self-study",
    label: "Self-Study",
    description: "I prefer learning on my own with occasional guidance",
  },
  {
    value: "guided",
    label: "Guided Learning",
    description: "I prefer structured sessions with regular check-ins",
  },
  {
    value: "mixed",
    label: "Mixed Approach",
    description: "A combination of both self-study and guided sessions",
  },
];

export default function MenteeRegistrationForm({
  onSubmit,
  isSubmitting,
  initialData,
  mode = "create",
}: MenteeRegistrationFormProps) {
  const [discordUsername, setDiscordUsername] = useState(
    initialData?.discordUsername || ""
  );
  const [education, setEducation] = useState(initialData?.education || "");
  const [skillsSought, setSkillsSought] = useState<string[]>(
    initialData?.skillsSought || []
  );
  const [careerGoals, setCareerGoals] = useState(
    initialData?.careerGoals || ""
  );
  const [learningStyle, setLearningStyle] = useState<
    "self-study" | "guided" | "mixed"
  >(initialData?.learningStyle || "mixed");
  const [customSkillInput, setCustomSkillInput] = useState("");

  // Separate predefined and custom skills
  const customSkills = skillsSought.filter(
    (skill) => !SKILLS_OPTIONS.includes(skill)
  );

  const toggleSkill = (skill: string) => {
    setSkillsSought((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const addCustomSkill = () => {
    const trimmed = customSkillInput.trim();
    if (!trimmed) return;
    // Check for duplicates (case-insensitive)
    const isDuplicate = skillsSought.some(
      (s) => s.toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      setCustomSkillInput("");
      return;
    }
    setSkillsSought((prev) => [...prev, trimmed]);
    setCustomSkillInput("");
  };

  const removeCustomSkill = (skill: string) => {
    setSkillsSought((prev) => prev.filter((s) => s !== skill));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (skillsSought.length === 0) {
      alert("Please select at least one skill you want to learn");
      return;
    }

    if (!careerGoals.trim()) {
      alert("Please describe your career goals");
      return;
    }

    if (!discordUsername.trim()) {
      alert("Please enter your Discord username");
      return;
    }

    await onSubmit({
      discordUsername: discordUsername.trim(),
      education,
      skillsSought,
      careerGoals,
      learningStyle,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Discord Username */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-semibold">Discord Username *</span>
          <div
            className="tooltip tooltip-left"
            data-tip="Open Discord → Click your username (bottom left) → Settings (gear icon) → My Account → Copy your username (without the @)"
          >
            <button type="button" className="btn btn-ghost btn-xs btn-circle">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                className="w-4 h-4 stroke-current"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
            </button>
          </div>
        </label>
        <input
          type="text"
          placeholder="e.g., jane_dev"
          className="input input-bordered w-full"
          value={discordUsername}
          onChange={(e) =>
            setDiscordUsername(e.target.value.toLowerCase().replace(/\s/g, ""))
          }
          required
        />
        <label className="label">
          <span className="label-text-alt text-base-content/60">
            Used to add you to private mentorship channels on Discord
          </span>
        </label>
      </div>

      {/* Education Background */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-semibold">
            Educational Background
          </span>
        </label>
        <input
          type="text"
          placeholder="e.g., BS in Computer Science, Self-taught Developer, Bootcamp Graduate"
          className="input input-bordered w-full"
          value={education}
          onChange={(e) => setEducation(e.target.value)}
        />
        <label className="label">
          <span className="label-text-alt text-base-content/60">
            This helps mentors understand your starting point
          </span>
        </label>
      </div>

      {/* Skills Sought */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-semibold">
            Skills You Want to Learn *
          </span>
          <span className="label-text-alt">{skillsSought.length} selected</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {SKILLS_OPTIONS.map((skill) => (
            <button
              key={skill}
              type="button"
              onClick={() => toggleSkill(skill)}
              className={`btn btn-sm ${skillsSought.includes(skill) ? "btn-secondary" : "btn-outline"}`}
            >
              {skill}
            </button>
          ))}
        </div>

        {/* Custom Skills Display */}
        {customSkills.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {customSkills.map((skill) => (
              <button
                key={skill}
                type="button"
                onClick={() => removeCustomSkill(skill)}
                className="btn btn-sm btn-accent gap-1"
              >
                {skill}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            ))}
          </div>
        )}

        {/* Custom Skills Input */}
        <div className="flex gap-2 mt-3">
          <input
            type="text"
            placeholder="Add custom skill..."
            className="input input-bordered input-sm flex-1"
            value={customSkillInput}
            onChange={(e) => setCustomSkillInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustomSkill();
              }
            }}
          />
          <button
            type="button"
            onClick={addCustomSkill}
            className="btn btn-sm btn-outline btn-accent"
            disabled={!customSkillInput.trim()}
          >
            + Add
          </button>
        </div>
        <label className="label">
          <span className="label-text-alt text-base-content/60">
            Select from the options above or add your own custom skills
          </span>
        </label>
      </div>

      {/* Career Goals */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-semibold">Career Goals *</span>
          <span className="label-text-alt text-base-content/60">
            {careerGoals.length}/500 characters
          </span>
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
          <span className="label-text font-semibold">
            Preferred Learning Style
          </span>
        </label>
        <div className="space-y-3">
          {LEARNING_STYLES.map((style) => (
            <label
              key={style.value}
              className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all ${
                learningStyle === style.value
                  ? "border-primary bg-primary/5"
                  : "border-base-300 hover:border-primary/50"
              }`}
            >
              <input
                type="radio"
                name="learningStyle"
                value={style.value}
                checked={learningStyle === style.value}
                onChange={(e) =>
                  setLearningStyle(e.target.value as typeof learningStyle)
                }
                className="radio radio-primary mt-1"
              />
              <div>
                <div className="font-semibold">{style.label}</div>
                <div className="text-sm text-base-content/60">
                  {style.description}
                </div>
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
              {mode === "edit" ? "Saving Changes..." : "Creating Profile..."}
            </>
          ) : mode === "edit" ? (
            "Save Changes"
          ) : (
            "Complete Registration"
          )}
        </button>
      </div>
    </form>
  );
}
