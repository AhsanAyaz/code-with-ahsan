"use client";

import { useState } from "react";
import { DEFAULT_MAX_MENTEES } from "@/lib/mentorship-constants";

interface MentorRegistrationFormProps {
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  isSubmitting: boolean;
  initialData?: {
    username?: string;
    discordUsername?: string;
    expertise?: string[];
    currentRole?: string;
    bio?: string;
    cvUrl?: string;
    majorProjects?: string;
    maxMentees?: number;
    availability?: Record<string, boolean>;
    isPublic?: boolean;
  };
  mode?: "create" | "edit";
}

const EXPERTISE_OPTIONS = [
  "Web Development",
  "Mobile Development",
  "Backend Development",
  "DevOps & Cloud",
  "Data Science",
  "Machine Learning",
  "UI/UX Design",
  "Product Management",
  "Career Growth",
  "Interview Prep",
  "System Design",
  "Leadership",
];

const DAYS_OF_WEEK = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export default function MentorRegistrationForm({
  onSubmit,
  isSubmitting,
  initialData,
  mode = "create",
}: MentorRegistrationFormProps) {
  const [expertise, setExpertise] = useState<string[]>(
    initialData?.expertise || []
  );
  const [currentRole, setCurrentRole] = useState(
    initialData?.currentRole || ""
  );
  const [bio, setBio] = useState(initialData?.bio || "");
  const [cvUrl, setCvUrl] = useState(initialData?.cvUrl || "");
  const [majorProjects, setMajorProjects] = useState(
    initialData?.majorProjects || ""
  );
  const [maxMentees, setMaxMentees] = useState(
    initialData?.maxMentees || DEFAULT_MAX_MENTEES
  );
  const [availability, setAvailability] = useState<Record<string, boolean>>(
    initialData?.availability || {}
  );
  const [isPublic, setIsPublic] = useState(initialData?.isPublic ?? true);
  const [username, setUsername] = useState(initialData?.username || "");
  const [discordUsername, setDiscordUsername] = useState(
    initialData?.discordUsername || ""
  );
  const [customExpertiseInput, setCustomExpertiseInput] = useState("");

  // Separate predefined and custom expertise
  const customExpertise = expertise.filter(
    (skill) => !EXPERTISE_OPTIONS.includes(skill)
  );

  const toggleExpertise = (skill: string) => {
    setExpertise((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const addCustomExpertise = () => {
    const trimmed = customExpertiseInput.trim();
    if (!trimmed) return;
    // Check for duplicates (case-insensitive)
    const isDuplicate = expertise.some(
      (s) => s.toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      setCustomExpertiseInput("");
      return;
    }
    setExpertise((prev) => [...prev, trimmed]);
    setCustomExpertiseInput("");
  };

  const removeCustomExpertise = (skill: string) => {
    setExpertise((prev) => prev.filter((s) => s !== skill));
  };

  const toggleDay = (day: string) => {
    setAvailability((prev) => ({
      ...prev,
      [day]: !prev[day],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (expertise.length === 0) {
      alert("Please select at least one area of expertise");
      return;
    }

    if (!currentRole.trim()) {
      alert("Please enter your current role");
      return;
    }

    if (!discordUsername.trim()) {
      alert("Please enter your Discord username");
      return;
    }

    const availableDays = Object.entries(availability)
      .filter(([, isAvailable]) => isAvailable)
      .reduce(
        (acc, [day]) => {
          acc[day] = ["flexible"];
          return acc;
        },
        {} as Record<string, string[]>
      );

    await onSubmit({
      expertise,
      currentRole,
      bio,
      cvUrl: cvUrl.trim() || undefined,
      majorProjects: majorProjects.trim() || undefined,
      maxMentees,
      availability: availableDays,
      isPublic,
      discordUsername: discordUsername.trim(),
      ...(mode === "edit" && username ? { username: username.trim() } : {}),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Username - Only shown in edit mode */}
      {mode === "edit" && (
        <div className="form-control">
          <label className="label">
            <span className="label-text font-semibold">Username</span>
          </label>
          <div className="flex items-center gap-2">
            <span className="text-base-content/60">@</span>
            <input
              type="text"
              placeholder="your-username"
              className="input input-bordered flex-1"
              value={username}
              onChange={(e) =>
                setUsername(
                  e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "")
                )
              }
              minLength={3}
              maxLength={30}
            />
          </div>
          <label className="label">
            <span className="label-text-alt text-base-content/60">
              Your public profile URL: /mentorship/mentors/
              {username || "your-username"}
            </span>
          </label>
        </div>
      )}

      {/* Current Role */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-semibold">
            Current Role / Position *
          </span>
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
          <span className="label-text-alt text-base-content/60">
            This helps mentees understand your background
          </span>
        </label>
      </div>

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
          placeholder="e.g., john_dev"
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

      {/* Areas of Expertise */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-semibold">Areas of Expertise *</span>
          <span className="label-text-alt">{expertise.length} selected</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {EXPERTISE_OPTIONS.map((skill) => (
            <button
              key={skill}
              type="button"
              onClick={() => toggleExpertise(skill)}
              className={`btn btn-sm ${expertise.includes(skill) ? "btn-primary" : "btn-outline"}`}
            >
              {skill}
            </button>
          ))}
        </div>

        {/* Custom Expertise Display */}
        {customExpertise.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {customExpertise.map((skill) => (
              <button
                key={skill}
                type="button"
                onClick={() => removeCustomExpertise(skill)}
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

        {/* Custom Expertise Input */}
        <div className="flex gap-2 mt-3">
          <input
            type="text"
            placeholder="Add custom expertise..."
            className="input input-bordered input-sm flex-1"
            value={customExpertiseInput}
            onChange={(e) => setCustomExpertiseInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustomExpertise();
              }
            }}
          />
          <button
            type="button"
            onClick={addCustomExpertise}
            className="btn btn-sm btn-outline btn-accent"
            disabled={!customExpertiseInput.trim()}
          >
            + Add
          </button>
        </div>
        <label className="label">
          <span className="label-text-alt text-base-content/60">
            Select from the options above or add your own custom expertise
          </span>
        </label>
      </div>

      {/* Bio */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-semibold">Short Bio</span>
          <span className="label-text-alt text-base-content/60">
            {bio.length}/500 characters
          </span>
        </label>
        <textarea
          placeholder="Tell potential mentees about yourself, your journey, and what you can help with..."
          className="textarea textarea-bordered w-full h-32"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={500}
        />
      </div>

      {/* CV/Resume URL */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-semibold">CV / Resume Link</span>
          <span className="label-text-alt text-base-content/60">Optional</span>
        </label>
        <input
          type="url"
          placeholder="https://drive.google.com/... or https://linkedin.com/in/..."
          className="input input-bordered w-full"
          value={cvUrl}
          onChange={(e) => setCvUrl(e.target.value)}
        />
        <label className="label">
          <span className="label-text-alt text-base-content/60">
            Link to your CV, resume, or LinkedIn profile. Helps in verifying
            your experience.
          </span>
        </label>
      </div>

      {/* Major Projects */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-semibold">
            Major Projects & Experience
          </span>
          <span className="label-text-alt text-base-content/60">
            {majorProjects.length}/1000 characters
          </span>
        </label>
        <textarea
          placeholder="Describe your major projects and your role in them. For example:&#10;&#10;• Led the frontend team at XYZ Corp, built a React dashboard serving 100k users&#10;• Open source contributor to Angular, created popular state management library&#10;• Mentored 5+ developers who got promoted to senior positions"
          className="textarea textarea-bordered w-full h-40"
          value={majorProjects}
          onChange={(e) => setMajorProjects(e.target.value)}
          maxLength={1000}
        />
        <label className="label">
          <span className="label-text-alt text-base-content/60">
            Helps others understand your expertise and mentoring credentials.
          </span>
        </label>
      </div>

      {/* Max Mentees */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-semibold">
            Maximum Mentees at a Time
          </span>
          <span className="label-text-alt font-bold text-primary">
            {maxMentees}
          </span>
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
        <p className="text-xs text-base-content/60 mt-2">
          Manage your availability by limiting active mentees
        </p>
      </div>

      {/* Availability */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-semibold">Available Days</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {DAYS_OF_WEEK.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => toggleDay(day)}
              className={`btn btn-sm capitalize ${availability[day] ? "btn-secondary" : "btn-outline"}`}
            >
              {day.slice(0, 3)}
            </button>
          ))}
        </div>
        <label className="label">
          <span className="label-text-alt text-base-content/60">
            Select days you're generally available for mentorship sessions
          </span>
        </label>
      </div>

      {/* Public Profile Toggle */}
      <div className="form-control">
        <label className="label cursor-pointer justify-start gap-4">
          <input
            type="checkbox"
            className="toggle toggle-primary"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
          />
          <div>
            <span className="label-text font-semibold">
              Show me in Community Mentors
            </span>
            <p className="text-xs text-base-content/60 mt-1">
              When enabled, your profile will appear in the public mentors
              showcase, helping you gain visibility and recognition in the
              community.
            </p>
          </div>
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
