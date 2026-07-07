import type { Metadata } from "next";
import siteMetadata from "@/data/siteMetadata";
import HomeFAQ from "@/components/HomeFAQ";
import NewsletterForm from "@/components/NewsletterForm";
import HomeBanners from "@/components/HomeBanners";
import { getBanners, getCourses } from "@/lib/content/contentProvider";
import CommunityHero from "@/components/home/CommunityHero";
import PillarsGrid from "@/components/home/PillarsGrid";
import CommunityStats from "@/components/home/CommunityStats";
import SocialReachBar from "@/components/home/SocialReachBar";
import FounderCredibility from "@/components/home/FounderCredibility";
import TrustedByStrip from "@/components/home/TrustedByStrip";
import SponsorBand from "@/components/home/SponsorBand";
import SectionEyebrow from "@/components/home/SectionEyebrow";
import BooksSection from "@/components/portfolio/BooksSection";
import CoursesSection from "@/components/portfolio/CoursesSection";
import OpenSourceSection from "@/components/portfolio/OpenSourceSection";
import TestimonialsSection from "@/components/portfolio/TestimonialsSection";

export const metadata: Metadata = {
  title: "Code With Ahsan | Developer Community for Mentorship, Projects & Learning",
  description:
    "Join 4,500+ developers in a community built around mentorship, real-world projects, learning roadmaps, courses, and books.",
  openGraph: {
    title: "Code With Ahsan | Developer Community for Mentorship, Projects & Learning",
    description:
      "Join 4,500+ developers in a community built around mentorship, real-world projects, learning roadmaps, courses, and books.",
    images: ["/images/home-og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Code With Ahsan | Developer Community for Mentorship, Projects & Learning",
    description:
      "Join 4,500+ developers in a community built around mentorship, real-world projects, learning roadmaps, courses, and books.",
    images: ["/images/home-og.png"],
  },
};

async function getHomeBanners() {
  if (process.env.NEXT_PUBLIC_SHOW_BANNERS !== "true") return [];
  return getBanners();
}

export default async function Home() {
  const banners = await getHomeBanners();
  const courses = await getCourses();

  return (
    <>
      {/* 1. Banners */}
      <section className="page-padding border-t border-base-300 relative bg-base-100">
        <HomeBanners banners={banners} />
      </section>

      {/* 2. Community Hero (rebuilt) */}
      <CommunityHero />

      {/* 3. Trusted-by strip */}
      <TrustedByStrip />

      {/* 4. Live Community Stats + Social Reach */}
      <CommunityStats />
      <SocialReachBar />

      {/* 5. Ahsan's work showcase */}
      <section className="page-padding pt-16 bg-base-100 border-t border-base-300">
        <SectionEyebrow tag="work">built and shared with the community</SectionEyebrow>
      </section>
      <BooksSection />
      <CoursesSection courses={courses} />
      <OpenSourceSection />

      {/* 6. Community Pillars Grid */}
      <PillarsGrid />

      {/* 7. Testimonials */}
      <section className="page-padding pt-16 bg-base-100 border-t border-base-300">
        <SectionEyebrow tag="testimonials">what mentees say</SectionEyebrow>
      </section>
      <TestimonialsSection />

      {/* 8. Founder Credibility */}
      <FounderCredibility />

      {/* 9. Sponsor band */}
      <SponsorBand />

      {/* 10. Newsletter */}
      <section
        id="newsletter"
        className="py-16 page-padding border-t border-base-300 relative bg-base-100"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(143,39,224,0.05)_0%,transparent_70%)]"></div>
        <div className="relative z-10 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-base-content">
            Join the <span className="text-accent">Community</span>
          </h2>
          <p className="text-base-content/70 max-w-xl mx-auto mb-8">
            Get the latest tutorials, articles, and course updates delivered straight to your inbox.
            No spam, just code.
          </p>

          {siteMetadata.newsletter.provider !== "" && (
            <div className="max-w-md mx-auto">
              <NewsletterForm />
            </div>
          )}
        </div>
      </section>

      {/* 11. FAQ */}
      <HomeFAQ />
    </>
  );
}
