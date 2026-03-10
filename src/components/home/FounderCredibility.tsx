import Image from "next/image";
import Link from "next/link";

export default function FounderCredibility() {
  return (
    <section className="border-t border-base-300 bg-base-100 py-16">
      <div className="page-padding">
        <div className="max-w-4xl mx-auto flex flex-col lg:flex-row items-center gap-10">
          {/* Photo */}
          <div className="flex-shrink-0">
            <Image
              src="/static/images/avatar.jpeg"
              alt="Muhammad Ahsan Ayaz"
              width={160}
              height={160}
              className="rounded-full border-4 border-base-300 shadow-lg"
            />
          </div>

          {/* Bio */}
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left gap-4">
            {/* GDE badge */}
            <div className="flex items-center gap-3">
              <Image
                src="/static/images/gde_logo_brackets.png"
                alt="Google Developer Expert badge"
                width={48}
                height={48}
                className="object-contain"
              />
              <span className="text-xs font-mono text-base-content/50 uppercase tracking-wider">
                Google Developer Expert
              </span>
            </div>

            <h2 className="text-2xl font-bold text-base-content">
              Muhammad Ahsan Ayaz
            </h2>

            <p className="text-base-content/70 max-w-xl leading-relaxed">
              Google Developer Expert in Angular &amp; AI. Author, speaker, and
              the founder of Code With Ahsan — a community of 4,500+ developers
              learning and building together.
            </p>

            <Link
              href="/about"
              className="btn btn-outline btn-sm mt-1"
            >
              Learn more about Ahsan
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
