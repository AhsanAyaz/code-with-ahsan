import { testimonials } from "@/data/testimonials";

export default function TestimonialsSection() {
  return (
    <section className="border-t border-base-300 bg-base-200 py-16">
      <div className="page-padding">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-base-content mb-8">
            What People Say
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="bg-base-100 border border-base-300 rounded-xl p-6 flex flex-col gap-4"
              >
                {/* Quote */}
                <p className="italic text-base-content/70 leading-relaxed flex-1">
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
                      {testimonial.role}
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
