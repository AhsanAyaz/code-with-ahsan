"use client";

import { useEffect, useState } from "react";
import { Star, Quote, ShieldCheck, ExternalLink } from "lucide-react";
import { ConsultingReview } from "@/types/consulting";

export default function ConsultingTestimonials() {
  const [testimonials, setTestimonials] = useState<ConsultingReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const res = await fetch("/api/consulting/testimonials");
        if (res.ok) {
          const data = await res.json();
          setTestimonials(data.testimonials || []);
        }
      } catch (err) {
        console.error("Failed to load testimonials:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTestimonials();
  }, []);

  if (loading || testimonials.length === 0) {
    return null; // Gracefully hide section if no approved testimonials yet
  }

  return (
    <section className="space-y-8 pt-8 border-t border-base-300">
      <div className="text-center space-y-2 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-xs font-bold uppercase tracking-wider">
          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> Client Testimonials
        </div>
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
          What Engineers Say About 1:1 Sessions
        </h2>
        <p className="text-sm text-base-content/70">
          Real feedback from engineers, leads, and founders who booked architectural and career
          advisory consultations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {testimonials.map((t) => (
          <div
            key={t.id}
            className="card bg-base-200/50 hover:bg-base-200/80 border border-base-300/80 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm hover:shadow-md transition-all relative flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center text-amber-400 gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        star <= t.rating ? "fill-amber-400 text-amber-400" : "text-base-300"
                      }`}
                    />
                  ))}
                </div>
                <div className="text-xs text-base-content/50 font-mono flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-success" /> Verified Session
                </div>
              </div>

              <h3 className="font-bold text-base sm:text-lg text-base-content leading-snug">
                &ldquo;{t.headline}&rdquo;
              </h3>

              <p className="text-sm text-base-content/80 whitespace-pre-wrap leading-relaxed">
                {t.feedback}
              </p>
            </div>

            <div className="pt-4 border-t border-base-300/60 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                  {t.clientName.charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-sm leading-tight">{t.clientName}</div>
                  <div className="text-xs text-base-content/60 leading-tight mt-0.5">
                    {t.role ? (
                      <>
                        {t.role} {t.company ? `@ ${t.company}` : ""}
                      </>
                    ) : (
                      t.packageName
                    )}
                  </div>
                </div>
              </div>

              {t.linkedinUrl && (
                <a
                  href={t.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost btn-xs text-primary gap-1 shrink-0"
                  title="View Profile"
                >
                  Profile <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
