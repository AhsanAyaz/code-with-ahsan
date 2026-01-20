"use client";

import { useContext, useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthContext } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useMentorship } from "@/contexts/MentorshipContext";
import MentorRegistrationForm from "@/components/mentorship/MentorRegistrationForm";
import MenteeRegistrationForm from "@/components/mentorship/MenteeRegistrationForm";

// DEV_MODE: Set to true to bypass authentication for testing form layouts
const DEV_MODE = false;

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setShowLoginPopup } = useContext(AuthContext);
  const toast = useToast();
  const { user, profile, loading, refreshProfile } = useMentorship();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState<"mentor" | "mentee" | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const roleParam = searchParams.get("role");
    if (roleParam === "mentor" || roleParam === "mentee") {
      setSelectedRole(roleParam);
      setCurrentStep(2);
    }
  }, [searchParams]);

  useEffect(() => {
    // Skip auth redirect in DEV_MODE
    if (!DEV_MODE && !loading && !user) {
      setShowLoginPopup(true);
    }
  }, [loading, user, setShowLoginPopup]);

  useEffect(() => {
    // Skip profile redirect in DEV_MODE
    if (!DEV_MODE && !loading && profile) {
      // User already has a profile, redirect to dashboard
      router.push("/mentorship/dashboard");
    }
  }, [loading, profile, router]);

  if (!DEV_MODE && loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  if (!DEV_MODE && !user) {
    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body text-center">
          <h2 className="card-title justify-center text-2xl">
            Sign In Required
          </h2>
          <p className="text-base-content/70 mt-2">
            Please sign in to complete your mentorship profile.
          </p>
          <div className="card-actions justify-center mt-6">
            <button
              className="btn btn-primary btn-lg"
              onClick={() => setShowLoginPopup(true)}
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleRoleSelect = (role: "mentor" | "mentee") => {
    setSelectedRole(role);
    setCurrentStep(2);
  };

  const handleFormSubmit = async (formData: Record<string, unknown>) => {
    if (!user || !selectedRole) return;

    setIsSubmitting(true);
    try {
      const profileData = {
        uid: user.uid,
        role: selectedRole,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        ...formData,
      };

      const response = await fetch("/api/mentorship/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileData),
      });

      if (response.ok) {
        await refreshProfile();
        setCurrentStep(3);
        // Short delay then redirect
        setTimeout(() => {
          router.push("/mentorship/dashboard");
        }, 2000);
      } else {
        const error = await response.json();
        toast.error("Failed to create profile: " + error.error);
      }
    } catch (error) {
      console.error("Error creating profile:", error);
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <ul className="steps steps-horizontal w-full">
        <li className={`step ${currentStep >= 1 ? "step-primary" : ""}`}>
          Choose Role
        </li>
        <li className={`step ${currentStep >= 2 ? "step-primary" : ""}`}>
          Fill Profile
        </li>
        <li className={`step ${currentStep >= 3 ? "step-primary" : ""}`}>
          Complete
        </li>
      </ul>

      {/* Step 1: Role Selection */}
      {currentStep === 1 && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-2xl mb-4">What brings you here?</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <button
                onClick={() => handleRoleSelect("mentor")}
                className="card bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 hover:border-primary/50 transition-all cursor-pointer"
              >
                <div className="card-body text-left">
                  <div className="text-5xl mb-4">🎯</div>
                  <h3 className="card-title text-xl">I&apos;m a Mentor</h3>
                  <p className="text-base-content/70">
                    I have experience to share and want to help others grow.
                  </p>
                </div>
              </button>

              <button
                onClick={() => handleRoleSelect("mentee")}
                className="card bg-gradient-to-br from-secondary/10 to-secondary/5 border border-secondary/20 hover:border-secondary/50 transition-all cursor-pointer"
              >
                <div className="card-body text-left">
                  <div className="text-5xl mb-4">🚀</div>
                  <h3 className="card-title text-xl">I&apos;m a Mentee</h3>
                  <p className="text-base-content/70">
                    I want to learn from experienced professionals.
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Profile Form */}
      {currentStep === 2 && selectedRole && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => {
                  setCurrentStep(1);
                  setSelectedRole(null);
                }}
                className="btn btn-ghost btn-sm"
              >
                ← Back
              </button>
              <h2 className="card-title text-2xl">
                {selectedRole === "mentor"
                  ? "🎯 Mentor Profile"
                  : "🚀 Mentee Profile"}
              </h2>

              {/* Role Description */}
              <div
                className={`alert mt-4 ${selectedRole === "mentor" ? "alert-info" : "alert-success"}`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  className="stroke-current shrink-0 w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
                <div>
                  {selectedRole === "mentor" ? (
                    <p>
                      Share your expertise and help others grow in their
                      careers. Guide mentees through challenges, celebrate their
                      wins, and make a lasting impact on their professional
                      journey.
                    </p>
                  ) : (
                    <p>
                      Get guidance from experienced professionals. Accelerate
                      your learning, overcome challenges with expert support,
                      and achieve your career goals faster with personalized
                      mentorship.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {selectedRole === "mentor" ? (
              <MentorRegistrationForm
                onSubmit={handleFormSubmit}
                isSubmitting={isSubmitting}
              />
            ) : (
              <MenteeRegistrationForm
                onSubmit={handleFormSubmit}
                isSubmitting={isSubmitting}
              />
            )}
          </div>
        </div>
      )}

      {/* Step 3: Success */}
      {currentStep === 3 && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="card-title justify-center text-2xl text-success">
              Profile Created!
            </h2>
            <p className="text-base-content/70 mt-2">
              Welcome to the mentorship program! Redirecting you to your
              dashboard...
            </p>
            <div className="mt-4">
              <span className="loading loading-dots loading-lg text-primary"></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-[50vh]">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}
