import { Handshake, Linkedin } from "lucide-react";
import { COLLABORATION_PARTNERS, COLLABORATION_REPRESENTATIVES, SECTION_IDS } from "../constants";
import PartnerGrid from "./PartnerGrid";
import PersonAvatar from "./PersonAvatar";

// Server Component: static markup only, hover states handled in CSS.
// Card styling mirrors OrganizersSection so people read consistently across
// the page, minus the scroll-reveal so this can stay server-rendered.

const CollaborationPartnersSection = () => {
  if (COLLABORATION_PARTNERS.length === 0) return null;

  return (
    <section
      id={SECTION_IDS.collaborationPartners}
      className="relative overflow-hidden pb-12 sm:pb-16"
    >
      <div className="container relative z-10 mx-auto px-4 sm:px-6">
        <div className="mb-8 text-center">
          <div className="mb-3 flex items-center justify-center gap-2">
            <Handshake className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold text-primary sm:text-3xl">Collaboration Partners</h2>
          </div>
          <p className="mx-auto max-w-2xl text-sm text-base-content/70 sm:text-base">
            Communities and organisations helping us put the day together.
          </p>
        </div>

        <PartnerGrid partners={COLLABORATION_PARTNERS} />

        {COLLABORATION_REPRESENTATIVES.length > 0 && (
          <div className="mt-12">
            <p className="mb-5 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-base-content/40">
              Representatives
            </p>

            <div className="mx-auto flex max-w-xl flex-wrap justify-center gap-5">
              {COLLABORATION_REPRESENTATIVES.map((rep) => (
                <article
                  key={rep.name}
                  className="group relative w-full max-w-[260px] overflow-hidden rounded-2xl border border-primary/15 bg-base-200 p-5 text-center shadow-[0_0_16px_rgba(143,39,224,0.08)] transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/40 hover:shadow-[0_0_30px_rgba(143,39,224,0.22)] sm:w-[calc(50%-0.625rem)]"
                >
                  {/* Hover glow */}
                  <span className="pointer-events-none absolute -top-10 left-1/2 h-24 w-24 -translate-x-1/2 rounded-full bg-primary/20 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100" />

                  <div className="relative mb-3 flex justify-center">
                    <PersonAvatar
                      name={rep.name}
                      src={rep.avatarUrl}
                      size={96}
                      className="transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>

                  <h3 className="relative text-base font-semibold leading-tight text-base-content">
                    {rep.name}
                  </h3>

                  <p className="relative mt-1 text-xs text-base-content/60">{rep.role}</p>

                  <div className="relative mt-4 flex items-center justify-center gap-2">
                    <a
                      href={rep.linkedinUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      aria-label={`${rep.name} on LinkedIn`}
                      title={`${rep.name} on LinkedIn`}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/25 bg-base-300 text-base-content/70 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/60 hover:bg-primary/15 hover:text-primary"
                    >
                      <Linkedin className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default CollaborationPartnersSection;
