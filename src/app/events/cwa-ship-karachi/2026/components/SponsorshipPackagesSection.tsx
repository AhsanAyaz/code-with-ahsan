import { FileText, Mail } from "lucide-react";
import { EVENT, SECTION_IDS } from "../constants";

// Server Component: static markup only, hover states handled in CSS.

const SponsorshipPackagesSection = () => {
  return (
    <section
      id={SECTION_IDS.sponsorshipPackages}
      className="relative overflow-hidden py-16 sm:py-24"
    >
      <div className="container relative z-10 mx-auto px-4 sm:px-6">
        <div className="mx-auto max-w-3xl rounded-2xl border border-primary/20 bg-base-200 p-8 text-center shadow-[0_0_25px_rgba(143,39,224,0.1)] sm:p-12">
          <h2 className="mb-4 text-2xl font-bold text-primary sm:text-3xl md:text-4xl">
            Sponsor {EVENT.name}
          </h2>

          <p className="mx-auto mb-3 max-w-2xl text-base text-base-content/80 sm:text-lg">
            Put your brand in front of the developers building real products with AI — in the room,
            on the day.
          </p>
          <p className="mx-auto mb-8 max-w-2xl text-sm text-base-content/60">
            Full tiers, pricing and in-kind options are in the sponsorship deck. Prefer something
            custom? Talk to us.
          </p>

          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href={EVENT.sponsorshipDeckUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary btn-lg gap-2 rounded-xl shadow-[0_0_20px_rgba(143,39,224,0.35)] transition-transform duration-300 hover:scale-[1.03]"
            >
              <FileText className="h-4 w-4" />
              View Sponsorship Deck
            </a>
            <a
              href={`#${SECTION_IDS.contact}`}
              className="btn btn-outline btn-primary btn-lg gap-2 rounded-xl"
            >
              <Mail className="h-4 w-4" />
              Contact Us
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SponsorshipPackagesSection;
