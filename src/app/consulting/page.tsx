"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import {
  CheckCircle2,
  ShieldCheck,
  Video,
  ArrowRight,
  HelpCircle,
  Code2,
  Award,
} from "lucide-react";
import ConsultingSlotPicker from "@/components/consulting/ConsultingSlotPicker";
import { CONSULTING_PACKAGES } from "@/lib/consulting/constants";
import { ConsultingPackage, ConsultingAvailableSlot } from "@/types/consulting";

export default function ConsultingPage() {
  const [selectedPackage, setSelectedPackage] = useState<ConsultingPackage>(
    CONSULTING_PACKAGES[1] // Default to 60-min Architecture Review
  );
  const [selectedSlot, setSelectedSlot] = useState<ConsultingAvailableSlot | null>(null);
  const [timezone, setTimezone] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      } catch {
        return "UTC";
      }
    }
    return "UTC";
  });

  // Client intake form state
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientNotes, setClientNotes] = useState("");
  const [githubOrLinkedinUrl, setGithubOrLinkedinUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) {
      setErrorMessage("Please select a date and time slot.");
      return;
    }
    if (!clientName || !clientEmail) {
      setErrorMessage("Please enter your name and email address.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/consulting/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: selectedPackage.id,
          startTime: selectedSlot.start,
          endTime: selectedSlot.end,
          timezone,
          clientName,
          clientEmail,
          clientNotes: clientNotes || undefined,
          githubOrLinkedinUrl: githubOrLinkedinUrl || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Failed to start checkout. Please try again.");
        setSubmitting(false);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        setErrorMessage("Unexpected checkout response.");
        setSubmitting(false);
      }
    } catch (err) {
      console.error("Checkout error:", err);
      setErrorMessage("An unexpected error occurred. Please try again.");
      setSubmitting(false);
    }
  };

  const formattedSelectedTime = selectedSlot
    ? format(toZonedTime(parseISO(selectedSlot.start), timezone), "EEEE, MMMM d, yyyy 'at' h:mm a")
    : null;

  return (
    <div className="min-h-screen bg-base-100 text-base-content py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-16">
        {/* Hero Section */}
        <section className="text-center space-y-6 pt-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-semibold border border-primary/20">
            <Award className="w-4 h-4" /> Google Developer Expert (GDE) • 1:1 Advisory
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            1:1 Technical Advisory & Architecture Review
          </h1>
          <p className="max-w-3xl mx-auto text-base sm:text-lg text-base-content/80 leading-relaxed">
            Get personalized technical advice, code reviews, and career strategy directly from{" "}
            <strong>Muhammad Ahsan Ayaz</strong> — Google Developer Expert, author, and frontend
            architect.
          </p>

          <div className="flex flex-wrap justify-center items-center gap-6 pt-2 text-xs sm:text-sm text-base-content/70">
            <span className="flex items-center gap-1.5">
              <Video className="w-4 h-4 text-success" /> Live Google Meet Video
            </span>
            <span className="flex items-center gap-1.5">
              <Code2 className="w-4 h-4 text-primary" /> Angular, Web & Cloud Strategy
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-accent" /> Guaranteed Actionable Next Steps
            </span>
          </div>
        </section>

        {/* Step 1: Package Selection */}
        <section className="space-y-6">
          <div className="text-center space-y-2">
            <span className="badge badge-primary badge-outline text-xs uppercase font-bold tracking-widest">
              Step 1
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold">Select Your Consultation Tier</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {CONSULTING_PACKAGES.map((pkg) => {
              const isSelected = selectedPackage.id === pkg.id;
              return (
                <div
                  key={pkg.id}
                  onClick={() => {
                    setSelectedPackage(pkg);
                    setSelectedSlot(null); // Reset slot if duration changes
                  }}
                  className={`cursor-pointer relative flex flex-col justify-between p-6 rounded-2xl border-2 transition-all duration-200 ${
                    isSelected
                      ? "border-primary bg-base-200/90 shadow-2xl scale-[1.02]"
                      : "border-base-300 bg-base-200/40 hover:border-primary/40 hover:bg-base-200/70"
                  }`}
                >
                  {pkg.badge && (
                    <span className="absolute -top-3 right-6 badge badge-primary text-xs font-semibold shadow">
                      {pkg.badge}
                    </span>
                  )}

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-bold">{pkg.name}</h3>
                      <p className="text-xs text-base-content/70 mt-1 min-h-[36px]">
                        {pkg.description}
                      </p>
                    </div>

                    <div className="flex items-baseline gap-1 py-2">
                      <span className="text-3xl font-extrabold">
                        ${(pkg.priceInCents / 100).toFixed(0)}
                      </span>
                      <span className="text-xs text-base-content/60 font-semibold uppercase">
                        {pkg.currency} / {pkg.durationMinutes} mins
                      </span>
                    </div>

                    <ul className="space-y-2 text-xs text-base-content/80 pt-2 border-t border-base-300">
                      {pkg.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-6 mt-4">
                    <button
                      type="button"
                      className={`btn btn-sm w-full font-bold ${
                        isSelected ? "btn-primary" : "btn-outline"
                      }`}
                    >
                      {isSelected ? "Selected Tier" : "Choose This Tier"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Step 2 & 3: Calendar Slot Picker & Client Details */}
        <section className="space-y-8 pt-4">
          <div className="text-center space-y-2">
            <span className="badge badge-secondary badge-outline text-xs uppercase font-bold tracking-widest">
              Step 2 & 3
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold">Pick a Time & Confirm Details</h2>
            <p className="text-sm text-base-content/70">
              Selected Package: <strong>{selectedPackage.name}</strong> ($
              {(selectedPackage.priceInCents / 100).toFixed(0)} USD •{" "}
              {selectedPackage.durationMinutes} mins)
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Slot Picker (7 cols on large) */}
            <div className="lg:col-span-7 space-y-4">
              <ConsultingSlotPicker
                durationMinutes={selectedPackage.durationMinutes}
                selectedSlot={selectedSlot}
                onSelectSlot={setSelectedSlot}
                timezone={timezone}
                onChangeTimezone={setTimezone}
              />
            </div>

            {/* Intake Form & Checkout Summary (5 cols on large) */}
            <div className="lg:col-span-5 bg-base-200/60 backdrop-blur border border-base-300 rounded-2xl p-6 shadow-xl space-y-6">
              <h3 className="text-lg font-bold border-b border-base-300 pb-3">
                Your Details & Topic
              </h3>

              {errorMessage && (
                <div className="alert alert-error text-xs py-2 shadow-sm">
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleCheckout} className="space-y-4">
                <div>
                  <label className="label label-text text-xs font-semibold py-1">
                    Your Full Name <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alex Rivera"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="input input-bordered input-sm w-full bg-base-100"
                  />
                </div>

                <div>
                  <label className="label label-text text-xs font-semibold py-1">
                    Your Email Address <span className="text-error">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="alex@example.com"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className="input input-bordered input-sm w-full bg-base-100"
                  />
                </div>

                <div>
                  <label className="label label-text text-xs font-semibold py-1">
                    GitHub / LinkedIn / Project URL (Optional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://github.com/..."
                    value={githubOrLinkedinUrl}
                    onChange={(e) => setGithubOrLinkedinUrl(e.target.value)}
                    className="input input-bordered input-sm w-full bg-base-100"
                  />
                </div>

                <div>
                  <label className="label label-text text-xs font-semibold py-1">
                    What would you like to cover?
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Briefly describe your goals, tech stack, or questions..."
                    value={clientNotes}
                    onChange={(e) => setClientNotes(e.target.value)}
                    className="textarea textarea-bordered text-xs w-full bg-base-100"
                  ></textarea>
                </div>

                {/* Booking Summary Box */}
                <div className="bg-base-100 p-4 rounded-xl border border-base-300 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-base-content/70">Selected Session:</span>
                    <span className="font-semibold">{selectedPackage.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-base-content/70">Scheduled Time:</span>
                    <span className="font-semibold text-primary">
                      {formattedSelectedTime ? formattedSelectedTime : "No slot selected"}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-base-300 pt-2 font-bold text-sm">
                    <span>Total Due:</span>
                    <span>${(selectedPackage.priceInCents / 100).toFixed(2)} USD</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting || !selectedSlot}
                  className="btn btn-primary w-full font-bold shadow-lg gap-2"
                >
                  {submitting ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Redirecting to Stripe...
                    </>
                  ) : (
                    <>
                      Pay & Reserve Session <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <p className="text-[11px] text-center text-base-content/60 flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-success" />
                  Encrypted 256-bit Stripe Checkout. Free reschedule up to 24h before.
                </p>
              </form>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="max-w-3xl mx-auto space-y-6 pt-10 border-t border-base-300">
          <h2 className="text-2xl font-bold text-center flex items-center justify-center gap-2">
            <HelpCircle className="w-6 h-6 text-primary" /> Frequently Asked Questions
          </h2>

          <div className="space-y-4">
            <div className="collapse collapse-arrow bg-base-200/50 border border-base-300 rounded-xl">
              <input type="checkbox" />
              <div className="collapse-title text-sm font-bold">
                How does the video session work?
              </div>
              <div className="collapse-content text-xs text-base-content/80">
                Immediately after your payment is confirmed, an automatic Google Calendar invite
                with a dedicated Google Meet link is generated and sent to your email.
              </div>
            </div>

            <div className="collapse collapse-arrow bg-base-200/50 border border-base-300 rounded-xl">
              <input type="checkbox" />
              <div className="collapse-title text-sm font-bold">What if I need to reschedule?</div>
              <div className="collapse-content text-xs text-base-content/80">
                You can reschedule your appointment free of charge by replying to the confirmation
                email at least 24 hours prior to the scheduled start time.
              </div>
            </div>

            <div className="collapse collapse-arrow bg-base-200/50 border border-base-300 rounded-xl">
              <input type="checkbox" />
              <div className="collapse-title text-sm font-bold">Can I record the session?</div>
              <div className="collapse-content text-xs text-base-content/80">
                Yes, sessions can be recorded so you can review code walkthroughs and
                recommendations at your own pace.
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
