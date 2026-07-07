"use client";

import { useState } from "react";
import { Send, CheckCircle } from "lucide-react";

const BUDGET_OPTIONS = ["Under $1k", "$1k–$3k", "$3k–$6k", "$6k+", "Not sure yet"];

const FALLBACK_EMAIL = "ahsan.ubitian@gmail.com";

export default function SponsorContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [budget, setBudget] = useState(BUDGET_OPTIONS[4]);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  const mailtoFallback = () => {
    const subject = encodeURIComponent(`Sponsorship inquiry: ${company}`);
    const body = encodeURIComponent(
      `Hi Ahsan,\n\nName: ${name}\nEmail: ${email}\nCompany: ${company}\nBudget: ${budget}\n\n${message}`
    );
    return `mailto:${FALLBACK_EMAIL}?subject=${subject}&body=${body}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    try {
      const res = await fetch("/api/sponsorship", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, company, budget, message }),
      });
      if (!res.ok) throw new Error("Request failed");
      setStatus("success");
    } catch {
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="rounded-2xl bg-base-200 border border-base-300 p-8 text-center">
        <CheckCircle className="w-10 h-10 text-success mx-auto mb-3" aria-hidden="true" />
        <h3 className="font-semibold text-lg text-base-content mb-2">Thanks for reaching out!</h3>
        <p className="text-sm text-base-content/70">
          We&apos;ve received your inquiry and will get back to you within 24 hours. Want to move
          faster?{" "}
          <a
            href="https://calendar.app.google/Z6g5dMyczq25hmjYA"
            target="_blank"
            rel="noopener noreferrer"
            className="link link-primary"
          >
            Book a call
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl bg-base-200 border border-base-300 p-6 sm:p-8 flex flex-col gap-4"
    >
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="form-control">
          <span className="label-text mb-1">Your name *</span>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input input-bordered w-full"
            placeholder="Maria"
            autoComplete="name"
          />
        </label>
        <label className="form-control">
          <span className="label-text mb-1">Work email *</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input input-bordered w-full"
            placeholder="maria@brand.com"
            autoComplete="email"
          />
        </label>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="form-control">
          <span className="label-text mb-1">Company *</span>
          <input
            type="text"
            required
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="input input-bordered w-full"
            placeholder="Acme Inc."
            autoComplete="organization"
          />
        </label>
        <label className="form-control">
          <span className="label-text mb-1">Budget range</span>
          <select
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className="select select-bordered w-full"
          >
            {BUDGET_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="form-control">
        <span className="label-text mb-1">Message</span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="textarea textarea-bordered w-full min-h-28"
          placeholder="Tell us about your product, target audience, and campaign goals."
        />
      </label>

      {status === "error" && (
        <div className="text-sm text-error">
          Something went wrong sending your inquiry.{" "}
          <a href={mailtoFallback()} className="link">
            Email us directly instead
          </a>
          .
        </div>
      )}

      <button type="submit" disabled={status === "submitting"} className="btn btn-primary mt-2">
        {status === "submitting" ? (
          <span className="loading loading-spinner loading-sm" />
        ) : (
          <Send className="w-4 h-4" aria-hidden="true" />
        )}
        Send inquiry
      </button>
    </form>
  );
}
