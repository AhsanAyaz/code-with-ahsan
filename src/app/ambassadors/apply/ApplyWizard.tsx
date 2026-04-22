"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMentorship } from "@/contexts/MentorshipContext";
import { useToast } from "@/contexts/ToastContext";
import { authFetch } from "@/lib/apiClient";
import { useApplyForm } from "./useApplyForm";
import EligibilityStep from "./steps/EligibilityStep";
import PersonalInfoStep from "./steps/PersonalInfoStep";
import ApplicationStep from "./steps/ApplicationStep";
import ReviewStep from "./steps/ReviewStep";

type Step = 1 | 2 | 3 | 4;

export default function ApplyWizard() {
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const { user, loading } = useMentorship();
  const toast = useToast();
  const router = useRouter();
  const form = useApplyForm();

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="alert alert-info">
        <span>
          Please{" "}
          <a href="/auth" className="link">
            sign in
          </a>{" "}
          to apply.
        </span>
      </div>
    );
  }

  const goNext = (from: Step) => {
    if (from === 1) {
      setStep(2);
      return;
    }
    if (!form.validateStep(from)) {
      toast.error("Please fix the highlighted fields before continuing.");
      return;
    }
    setStep((from + 1) as Step);
  };

  const goBack = () => setStep((s) => (s > 1 ? ((s - 1) as Step) : s));

  const handleSubmit = async () => {
    if (!form.validateStep(3)) {
      setStep(3);
      return;
    }
    setSubmitting(true);
    try {
      const payload = form.buildSubmitPayload();
      const res = await authFetch("/api/ambassador/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) {
        const msg = body.error ?? `Submission failed (HTTP ${res.status})`;
        toast.error(msg);
        return;
      }
      toast.success("Application submitted! We'll be in touch soon.");
      router.push("/profile");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* DaisyUI step header */}
      <ul className="steps steps-horizontal w-full mb-8">
        <li className={`step ${step >= 1 ? "step-primary" : ""}`}>Eligibility</li>
        <li className={`step ${step >= 2 ? "step-primary" : ""}`}>Your Info</li>
        <li className={`step ${step >= 3 ? "step-primary" : ""}`}>Application</li>
        <li className={`step ${step >= 4 ? "step-primary" : ""}`}>Review</li>
      </ul>

      {step === 1 && <EligibilityStep onEligible={() => goNext(1)} />}
      {step === 2 && (
        <PersonalInfoStep form={form} onNext={() => goNext(2)} onBack={goBack} />
      )}
      {step === 3 && (
        <ApplicationStep form={form} onNext={() => goNext(3)} onBack={goBack} />
      )}
      {step === 4 && (
        <ReviewStep
          form={form}
          onBack={goBack}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
      )}
    </div>
  );
}
