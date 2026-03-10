import { workHistory } from "@/data/workHistory";

export default function WorkHistorySection() {
  return (
    <section className="border-t border-base-300 bg-base-100 py-16">
      <div className="page-padding">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-base-content mb-8">
            Professional Experience
          </h2>

          {/* Timeline */}
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-4 top-0 bottom-0 w-px bg-base-300" />

            <ul className="space-y-8">
              {workHistory.map((entry, index) => (
                <li key={index} className="relative pl-12">
                  {/* Timeline dot */}
                  <div className="absolute left-0 top-1.5 w-8 h-8 rounded-full bg-base-100 border-2 border-base-300 flex items-center justify-center">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        entry.current ? "bg-primary" : "bg-base-content/30"
                      }`}
                    />
                  </div>

                  {/* Entry card */}
                  <div className="bg-base-100 border border-base-300 rounded-xl p-5">
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
                      <h3 className="font-bold text-base-content text-lg leading-tight">
                        {entry.company}
                      </h3>
                      {entry.current && (
                        <span className="badge badge-primary badge-sm">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-base-content/80 font-medium">
                      {entry.role}
                    </p>
                    <p className="text-sm text-base-content/50 mt-0.5">
                      {entry.period} &middot; {entry.location}
                    </p>
                    <p className="text-base-content/70 mt-2 leading-relaxed text-sm">
                      {entry.description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
