import Link from "next/link";
import SectionEyebrow from "@/components/home/SectionEyebrow";

export default function SponsorBand() {
  return (
    <section className="py-16 page-padding border-t border-base-300 relative bg-base-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(31,178,166,0.06)_0%,transparent_70%)]"></div>
      <div className="relative z-10 max-w-5xl mx-auto text-center">
        <SectionEyebrow tag="sponsor">put your product in front of developers</SectionEyebrow>
        <h2 className="text-3xl md:text-4xl font-bold text-base-content">
          Put your product in front of 180,000+ developers
        </h2>
        <p className="mt-6 text-base-content/70 max-w-2xl mx-auto">
          Sponsorships across YouTube, Instagram, LinkedIn, the newsletter, and Discord — content
          developers already trust.
        </p>
        <div className="mt-8">
          <Link href="/sponsors" className="btn btn-accent">
            See sponsorship options
          </Link>
        </div>
      </div>
    </section>
  );
}
