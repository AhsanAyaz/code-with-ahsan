import { BRAND_LOGOS } from "@/app/sponsors/logos";
import SectionEyebrow from "@/components/home/SectionEyebrow";

export default function TrustedByStrip() {
  return (
    <section className="page-padding bg-base-100 pb-16">
      <SectionEyebrow tag="trusted-by">brands we&apos;ve worked with</SectionEyebrow>
      <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6 text-base-content/70">
        {BRAND_LOGOS.map((logo) => (
          <a
            key={logo.name}
            href={logo.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={logo.name}
            title={logo.name}
            className={`opacity-70 hover:opacity-100 transition-opacity ${
              // Cloudways mark is stacked (icon over wordmark) — needs more
              // height to match the optical size of the flat wordmarks.
              logo.name === "Cloudways" ? "h-12 sm:h-14" : "h-7 sm:h-8"
            }`}
            dangerouslySetInnerHTML={{ __html: logo.svg }}
          />
        ))}
      </div>
    </section>
  );
}
