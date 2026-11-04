"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Star, CheckCircle2, MessageSquare, ArrowRight, ShieldCheck, Heart } from "lucide-react";

interface BookingInfo {
  id: string;
  clientName: string;
  packageName: string;
  durationMinutes: number;
  sessionDate: string;
  githubOrLinkedinUrl?: string;
}

function ReviewFormContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId");

  const [booking, setBooking] = useState<BookingInfo | null>(null);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [headline, setHeadline] = useState("");
  const [feedback, setFeedback] = useState("");
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [permissionToFeature, setPermissionToFeature] = useState(true);

  useEffect(() => {
    if (!bookingId) {
      setErrorMessage(
        "No booking ID found in URL. Please use the direct review link sent to your email."
      );
      setLoading(false);
      return;
    }

    const fetchBooking = async () => {
      try {
        const res = await fetch(`/api/consulting/review?bookingId=${bookingId}`);
        if (!res.ok) {
          throw new Error("Could not find consultation details");
        }
        const data = await res.json();
        setBooking(data.booking);
        setAlreadyReviewed(data.alreadyReviewed);
        if (data.booking?.githubOrLinkedinUrl) {
          setLinkedinUrl(data.booking.githubOrLinkedinUrl);
        }
      } catch (err) {
        setErrorMessage("Unable to load consultation details. Please ensure your link is valid.");
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingId) return;

    if (headline.trim().length < 3) {
      setErrorMessage("Please enter a short headline for your review.");
      return;
    }

    if (feedback.trim().length < 10) {
      setErrorMessage(
        "Please share a little more detail in your feedback (at least 10 characters)."
      );
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/consulting/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          rating,
          headline: headline.trim(),
          feedback: feedback.trim(),
          role: role.trim() || undefined,
          company: company.trim() || undefined,
          linkedinUrl: linkedinUrl.trim() || undefined,
          permissionToFeature,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Failed to submit review. Please try again.");
        setSubmitting(false);
        return;
      }

      setSubmitted(true);
    } catch {
      setErrorMessage("An unexpected error occurred while submitting your review.");
    } finally {
      setSubmitting(false);
    }
  };

  const getRatingLabel = (val: number) => {
    switch (val) {
      case 5:
        return "Exceptional! Highly recommended";
      case 4:
        return "Great session, very helpful";
      case 3:
        return "Good discussion";
      case 2:
        return "Average, had some questions";
      case 1:
        return "Needs improvement";
      default:
        return "";
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <span className="loading loading-spinner loading-lg text-primary"></span>
        <p className="text-sm text-base-content/70">Loading consultation details...</p>
      </div>
    );
  }

  if (errorMessage && !booking) {
    return (
      <div className="max-w-xl mx-auto bg-base-200 border border-base-300 rounded-3xl p-8 text-center space-y-6">
        <div className="w-12 h-12 rounded-full bg-error/10 text-error flex items-center justify-center mx-auto">
          <MessageSquare className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold">Review Link Not Found</h2>
        <p className="text-sm text-base-content/70">{errorMessage}</p>
        <Link href="/consulting" className="btn btn-primary btn-sm">
          Return to 1:1 Advisory
        </Link>
      </div>
    );
  }

  if (alreadyReviewed) {
    return (
      <div className="max-w-xl mx-auto bg-base-200/80 backdrop-blur border border-base-300 rounded-3xl p-8 sm:p-10 text-center space-y-6 shadow-xl">
        <div className="w-16 h-16 rounded-full bg-success/20 text-success flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold">Review Already Received!</h2>
        <p className="text-base text-base-content/80">
          Thank you, <strong>{booking?.clientName}</strong>! You have already submitted a
          testimonial for this session. Your feedback is deeply appreciated.
        </p>
        <div className="pt-4">
          <Link href="/consulting" className="btn btn-primary gap-2">
            View 1:1 Advisory <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto bg-base-200/80 backdrop-blur border border-base-300 rounded-3xl p-8 sm:p-10 text-center space-y-6 shadow-2xl animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-primary/20 text-primary flex items-center justify-center mx-auto shadow-inner">
          <Heart className="w-8 h-8 fill-primary text-primary" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Thank You So Much!</h2>
          <p className="text-base text-base-content/80">
            Your review for the <strong>{booking?.packageName}</strong> has been received. Your
            insights help fellow developers and engineers find the right guidance.
          </p>
        </div>
        <div className="p-4 bg-base-100/70 border border-base-300 rounded-2xl text-left text-sm space-y-1 text-base-content/70">
          <p>
            ⭐ <strong>Rating:</strong> {rating}/5
          </p>
          <p>
            💬 <strong>Headline:</strong> &ldquo;{headline}&rdquo;
          </p>
        </div>
        <div className="pt-4">
          <Link href="/consulting" className="btn btn-primary gap-2">
            Return to 1:1 Advisory <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  const activeStars = hoverRating || rating;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Session Context Banner */}
      <div className="bg-base-200/70 border border-base-300 rounded-3xl p-6 sm:p-8 space-y-3">
        <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
          <MessageSquare className="w-4 h-4" /> 1:1 Advisory Feedback
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
          How was your session, {booking?.clientName}?
        </h1>
        <p className="text-sm text-base-content/70">
          You completed the <strong>{booking?.packageName}</strong> on{" "}
          <strong>{booking?.sessionDate}</strong>.
        </p>
      </div>

      {/* Review Form Card */}
      <div className="bg-base-100 border border-base-300 rounded-3xl p-6 sm:p-10 shadow-xl space-y-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Star Rating Picker */}
          <div className="space-y-3 text-center sm:text-left">
            <label className="block text-sm font-bold uppercase tracking-wider text-base-content/80">
              Overall Rating
            </label>
            <div className="flex items-center justify-center sm:justify-start gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1.5 transition-transform hover:scale-125 focus:outline-none"
                  aria-label={`Rate ${star} stars`}
                >
                  <Star
                    className={`w-8 h-8 sm:w-10 sm:h-10 transition-colors ${
                      star <= activeStars
                        ? "fill-amber-400 text-amber-400"
                        : "text-base-300 stroke-[1.5]"
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="text-xs font-semibold text-amber-500 min-h-[1rem]">
              {getRatingLabel(activeStars)}
            </p>
          </div>

          {/* Headline */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-bold text-sm">Review Headline</span>
              <span className="label-text-alt text-xs text-base-content/60">
                e.g. &ldquo;Invaluable architectural insights!&rdquo;
              </span>
            </label>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="Summarize your experience in one sentence"
              maxLength={120}
              required
              className="input input-bordered w-full text-base"
            />
          </div>

          {/* Full Feedback */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-bold text-sm">Your Testimonial & Takeaways</span>
              <span className="label-text-alt text-xs text-base-content/60">
                What was most helpful?
              </span>
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={5}
              placeholder="Share what we discussed, how it helped unblock you, or your overall thoughts on the session..."
              required
              className="textarea textarea-bordered w-full text-base leading-relaxed"
            />
          </div>

          {/* Role & Company */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-bold text-sm">Your Role / Title (Optional)</span>
              </label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Software Engineer, Tech Lead"
                className="input input-bordered w-full text-sm"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-bold text-sm">Company / Project (Optional)</span>
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Kubermatic, Startup"
                className="input input-bordered w-full text-sm"
              />
            </div>
          </div>

          {/* LinkedIn / Profile URL */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-bold text-sm">
                LinkedIn / GitHub Profile URL (Optional)
              </span>
            </label>
            <input
              type="url"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              placeholder="https://linkedin.com/in/yourprofile"
              className="input input-bordered w-full text-sm font-mono"
            />
          </div>

          {/* Permission Checkbox */}
          <div className="flex items-start gap-3 p-4 bg-base-200/50 rounded-2xl border border-base-200">
            <input
              type="checkbox"
              id="permissionCheck"
              checked={permissionToFeature}
              onChange={(e) => setPermissionToFeature(e.target.checked)}
              className="checkbox checkbox-primary checkbox-sm mt-0.5"
            />
            <label
              htmlFor="permissionCheck"
              className="text-xs text-base-content/80 cursor-pointer select-none leading-relaxed"
            >
              <strong>Public Display Permission:</strong> I allow CodeWithAhsan to feature this
              testimonial publicly with my name and title on the advisory website.
            </label>
          </div>

          {errorMessage && (
            <div className="alert alert-error text-sm">
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary w-full shadow-lg hover:shadow-primary/20 text-base"
          >
            {submitting ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              <CheckCircle2 className="w-5 h-5" />
            )}
            {submitting ? "Submitting Review..." : "Submit Testimonial"}
          </button>
        </form>
      </div>

      <div className="text-center text-xs text-base-content/50 flex items-center justify-center gap-1.5">
        <ShieldCheck className="w-4 h-4 text-success" /> Verified Client Consultation Feedback •
        CodeWithAhsan
      </div>
    </div>
  );
}

export default function ConsultingReviewPage() {
  return (
    <div className="min-h-screen bg-base-100 text-base-content py-12 px-4 sm:px-6 lg:px-8">
      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <span className="loading loading-spinner loading-lg text-primary"></span>
            <p className="text-sm text-base-content/70">Loading review form...</p>
          </div>
        }
      >
        <ReviewFormContent />
      </Suspense>
    </div>
  );
}
