import Image from "next/image";
import Link from "next/link";

export default function PortfolioBio() {
  return (
    <section className="bg-base-100 py-16">
      <div className="page-padding">
        <div className="max-w-4xl mx-auto flex flex-col lg:flex-row items-center gap-10">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <Image
              src="/static/images/avatar.jpeg"
              alt="Muhammad Ahsan Ayaz"
              width={200}
              height={200}
              className="rounded-full border-4 border-base-300 shadow-lg"
              priority
            />
          </div>

          {/* Bio content */}
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
                Google Developer Expert in AI &amp; Angular
              </span>
            </div>

            {/* Name and title */}
            <div>
              <h1 className="text-3xl font-bold text-base-content">
                Muhammad Ahsan Ayaz
              </h1>
              <p className="text-base-content/60 mt-1">
                Software Architect | Google Developer Expert in AI &amp; Angular
                | Author | Speaker
              </p>
              <p className="text-base-content/50 text-sm mt-1">
                Scania Group, Stockholm
              </p>
            </div>

            {/* Bio paragraph */}
            <p className="text-base-content/70 max-w-xl leading-relaxed">
              With 10+ years of professional engineering experience, I am a
              Software Architect at Scania Group, a Google Developer Expert in
              AI &amp; Angular, and the author of 4 published books including
              the Angular Cookbook series. I founded Code With Ahsan — a
              community of 4,500+ developers — and speak regularly at
              international conferences on Angular, AI, and modern web
              development.
            </p>

            {/* Social links */}
            <div className="flex items-center gap-4 flex-wrap justify-center lg:justify-start">
              <Link
                href="https://github.com/ahsanayaz"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline btn-sm gap-2"
                aria-label="GitHub"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                </svg>
                GitHub
              </Link>
              <Link
                href="https://www.linkedin.com/in/ahsanayaz"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline btn-sm gap-2"
                aria-label="LinkedIn"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
                LinkedIn
              </Link>
              <Link
                href="https://twitter.com/codewith_ahsan"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline btn-sm gap-2"
                aria-label="X (Twitter)"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.736-8.832L1.254 2.25H8.08l4.256 5.632L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
                </svg>
                X / Twitter
              </Link>
              <Link
                href="mailto:muhd.ahsanayaz@gmail.com"
                className="btn btn-outline btn-sm gap-2"
                aria-label="Email"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
                Email
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
