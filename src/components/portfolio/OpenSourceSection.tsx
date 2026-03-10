import { openSourceProjects } from "@/data/openSourceProjects";

export default function OpenSourceSection() {
  return (
    <section className="border-t border-base-300 bg-base-200 py-16">
      <div className="page-padding">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-base-content mb-8">
            Open Source
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {openSourceProjects.map((project) => (
              <div
                key={project.name}
                className="bg-base-100 border border-base-300 rounded-xl p-6 hover:border-primary/40 transition-all flex flex-col gap-3"
              >
                {/* Name + stars */}
                <div className="flex items-start justify-between gap-2">
                  <a
                    href={project.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-base-content hover:text-primary transition-colors leading-tight"
                  >
                    {project.name}
                  </a>
                  {project.stars && (
                    <span className="text-xs text-base-content/50 whitespace-nowrap">
                      ⭐ {project.stars}
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className="text-sm text-base-content/70 leading-relaxed flex-1">
                  {project.description}
                </p>

                {/* Tech tags */}
                <div className="flex flex-wrap gap-1.5">
                  {project.tech.map((tag) => (
                    <span
                      key={tag}
                      className="badge badge-outline badge-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
