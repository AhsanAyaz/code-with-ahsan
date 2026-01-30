"use client";

import { useState, useRef } from "react";
import { DEFAULT_MAX_MENTEES } from "@/lib/mentorship-constants";
import { useToast } from "@/contexts/ToastContext";
import { getApp } from "firebase/app";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

const DISCORD_INVITE_URL = "https://codewithahsan.dev/discord";

interface MentorRegistrationFormProps {
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  isSubmitting: boolean;
  initialData?: {
    username?: string;
    displayName?: string;
    photoURL?: string;
    discordUsername?: string;
    discordUsernameValidated?: boolean;
    expertise?: string[];
    currentRole?: string;
    bio?: string;
    cvUrl?: string;
    majorProjects?: string;
    maxMentees?: number;
    availability?: Record<string, boolean>;
    isPublic?: boolean;
  };
  userId?: string;
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
  userId,
  mode = "create",
}: MentorRegistrationFormProps) {
  const toast = useToast();
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

  // Profile photo and display name (edit mode only)
  const [displayName, setDisplayName] = useState(
    initialData?.displayName || ""
  );
  const [photoURL, setPhotoURL] = useState(initialData?.photoURL || "");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Discord validation state
  const [isValidatingDiscord, setIsValidatingDiscord] = useState(false);
  const [discordValidated, setDiscordValidated] = useState(
    mode === "edit"
      ? initialData?.discordUsernameValidated ?? !!initialData?.discordUsername
      : false
  );
  const [discordValidationError, setDiscordValidationError] = useState<
    string | null
  >(
    mode === "edit" &&
      initialData?.discordUsername &&
      initialData?.discordUsernameValidated === false
      ? "Username not found on Discord server"
      : null
  );

  // Helper function to validate Discord username
  const validateDiscordUser = async (username: string) => {
    try {
      const response = await fetch("/api/mentorship/validate-discord", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discordUsername: username }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Validation failed");
      }

      return data;
    } catch (error) {
      console.error("Discord validation error:", error);
      throw error;
    }
  };

  // Verify Discord username against server
  const verifyDiscordUsername = async () => {
    if (!discordUsername.trim()) {
      toast.error("Please enter your Discord username first");
      return;
    }

    setIsValidatingDiscord(true);
    setDiscordValidationError(null);

    try {
      const data = await validateDiscordUser(discordUsername.trim());

      if (data.valid) {
        setDiscordValidated(true);
        setDiscordValidationError(null);
        // Update username to the exact one found on Discord
        if (data.username) {
          setDiscordUsername(data.username);
        }
        toast.success("Discord username verified!");
      } else {
        setDiscordValidated(false);
        setDiscordValidationError(data.message || "User not found on Discord");
      }
    } catch (error) {
      console.error("Discord validation error:", error);
      setDiscordValidated(false);
      setDiscordValidationError("Failed to verify Discord username");
      toast.error("Failed to verify Discord username");
    } finally {
      setIsValidatingDiscord(false);
    }
  };

  // Reset validation when username changes
  const handleDiscordUsernameChange = (value: string) => {
    const cleanValue = value.toLowerCase().replace(/\s/g, "");
    setDiscordUsername(cleanValue);
    // Reset validation if username changed
    if (discordValidated) {
      setDiscordValidated(false);
    }
    setDiscordValidationError(null);
  };

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

  // Handle profile image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast.error("Please select a valid image file (JPEG, PNG, GIF, or WebP)");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    setIsUploadingImage(true);
    try {
      const storage = getStorage(getApp());
      const timestamp = Date.now();
      const ext = file.name.split(".").pop() || "jpg";
      const storagePath = `mentorship-profiles/${userId}/avatar-${timestamp}.${ext}`;
      const storageRef = ref(storage, storagePath);

      await uploadBytes(storageRef, file, { contentType: file.type });
      const downloadURL = await getDownloadURL(storageRef);
      setPhotoURL(downloadURL);
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload image. Please try again.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!displayName.trim()) {
      toast.error("Please enter your display name");
      return;
    }

    if (expertise.length === 0) {
      toast.error("Please select at least one area of expertise");
      return;
    }

    if (!currentRole.trim()) {
      toast.error("Please enter your current role");
      return;
    }

    if (!discordUsername.trim()) {
      toast.error("Please enter your Discord username");
      return;
    }

    // Validate Discord username on submit
    let finalDiscordUsername = discordUsername.trim();
    try {
      // Show loading toast if we're doing a background validation
      // But since we block submit, maybe just rely on isSubmitting?
      // Actually isSubmitting is passed in, so we can't control it easily here before onSubmit.
      // We'll proceed with validation.

      const validationData = await validateDiscordUser(finalDiscordUsername);

      if (!validationData.valid) {
        setDiscordValidated(false);
        setDiscordValidationError(
          validationData.message || "User not found on Discord"
        );
        toast.error(
          validationData.message ||
            "Please verify your Discord username before saving"
        );
        return;
      }

      if (validationData.username) {
        finalDiscordUsername = validationData.username;
        setDiscordUsername(finalDiscordUsername);
        setDiscordValidated(true);
      }
    } catch (error) {
      console.error("Submit validation error:", error);
      toast.error("Failed to validate Discord username");
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
      displayName: displayName.trim(),
      expertise,
      currentRole,
      bio,
      cvUrl: cvUrl.trim() || undefined,
      majorProjects: majorProjects.trim() || undefined,
      maxMentees,
      availability: availableDays,
      isPublic,
      discordUsername: finalDiscordUsername,
      ...(mode === "edit" && username ? { username: username.trim() } : {}),
      ...(mode === "edit" && photoURL ? { photoURL } : {}),
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

      {/* Display Name and Profile Image */}
      <div className="form-control">
        <div className="flex flex-row gap-6 items-start">
          {/* Profile Image - Only shown in edit mode */}
          {mode === "edit" && (
            <div className="flex flex-col items-center gap-2">
              <div className="relative">
                <div className="avatar">
                  <div className="w-20 h-20 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2 overflow-hidden bg-base-200">
                    {photoURL ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photoURL}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl text-base-content/30">
                        👤
                      </div>
                    )}
                  </div>
                </div>
                {isUploadingImage && (
                  <div className="absolute inset-0 flex items-center justify-center bg-base-100/50 rounded-full">
                    <span className="loading loading-spinner loading-sm text-primary"></span>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleImageUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingImage}
                className="btn btn-xs btn-outline btn-primary"
              >
                {isUploadingImage ? "Uploading..." : "Change Photo"}
              </button>
              <span className="text-xs text-base-content/60 text-center">
                Max 5MB
              </span>
            </div>
          )}

          {/* Display Name */}
          <div className="flex-1">
            <label className="label pt-0">
              <span className="label-text font-semibold">Display Name *</span>
            </label>
            <input
              type="text"
              placeholder="Your full name"
              className="input input-bordered w-full"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
            <label className="label">
              <span className="label-text-alt text-base-content/60">
                This is how your name appears across the platform
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Current Role + Discord Username - Two column grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div className="flex items-center gap-2">
              {discordValidated && (
                <span className="text-success flex items-center gap-1 text-sm">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Verified
                </span>
              )}
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
            </div>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g., john_dev"
              className={`input input-bordered flex-1 ${
                discordValidated
                  ? "input-success"
                  : discordValidationError
                    ? "input-error"
                    : ""
              }`}
              value={discordUsername}
              onChange={(e) => handleDiscordUsernameChange(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={verifyDiscordUsername}
              disabled={isValidatingDiscord || !discordUsername.trim() || discordValidated}
              className={`btn ${
                discordValidated ? "btn-success" : "btn-primary"
              }`}
            >
              {isValidatingDiscord ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Verifying...
                </>
              ) : discordValidated ? (
                "✓ Verified"
              ) : (
                "Verify"
              )}
            </button>
          </div>
          {discordValidationError && (
            <div className="alert alert-warning mt-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="stroke-current shrink-0 h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div className="flex flex-col">
                <span>{discordValidationError}</span>
                <a
                  href={DISCORD_INVITE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link link-primary font-semibold"
                >
                  Join our Discord server →
                </a>
              </div>
            </div>
          )}
          <label className="label">
            <span className="label-text-alt text-base-content/60">
              {mode === "create"
                ? "You must be on our Discord server to register"
                : "Used for private mentorship channels"}
            </span>
          </label>
        </div>
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
          placeholder="Describe your major projects and your role in them..."
          className="textarea textarea-bordered w-full h-32"
          value={majorProjects}
          onChange={(e) => setMajorProjects(e.target.value)}
          maxLength={1000}
        />
        <label className="label">
          <span className="label-text-alt text-base-content/60">
            Helps others understand your expertise and credentials
          </span>
        </label>
      </div>

      {/* CV/Resume URL + Max Mentees - Two column grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CV/Resume URL */}
        <div className="form-control">
          <label className="label">
            <span className="label-text font-semibold">CV / Resume Link</span>
            <span className="label-text-alt text-base-content/60">
              Optional
            </span>
          </label>
          <input
            type="url"
            placeholder="https://linkedin.com/in/..."
            className="input input-bordered w-full"
            value={cvUrl}
            onChange={(e) => setCvUrl(e.target.value)}
          />
          <label className="label">
            <span className="label-text-alt text-base-content/60">
              LinkedIn or CV link for verification
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
        </div>
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
            Select days you&apos;re generally available for mentorship sessions
          </span>
        </label>
      </div>

      {/* Public Profile Toggle */}
      <div className="form-control">
        <label className="label cursor-pointer justify-start gap-4">
          <input
            type="checkbox"
            className="toggle toggle-primary [--tglbg:theme(colors.base-300)]"
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
