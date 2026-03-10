import { testimonials } from "@/data/testimonials";

export default function TestimonialsSection() {
  return (
    <section className="border-t border-base-300 bg-base-200 py-16">
      <div className="page-padding">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-base-content mb-2">
            What Mentees Say
          </h2>
          <p className="text-base-content/60 mb-8">
            Feedback from 1:1 mentorship sessions
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="bg-base-100 border border-base-300 rounded-xl p-6 flex flex-col gap-4"
              >
                {/* Rating */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span
                      key={i}
                      className={`text-sm ${i < testimonial.rating ? "text-warning" : "text-base-300"}`}
                    >
                      ★
                    </span>
                  ))}
                </div>

                {/* Quote */}
                <p className="italic text-base-content/70 leading-relaxed flex-1 text-sm">
                  &ldquo;{testimonial.text}&rdquo;
                </p>

                {/* Author */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-content flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {testimonial.avatarInitials}
                  </div>
                  <div>
                    <p className="font-semibold text-base-content text-sm">
                      {testimonial.name}
                    </p>
                    <p className="text-xs text-base-content/50">
                      {testimonial.date}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
