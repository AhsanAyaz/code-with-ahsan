import type { Metadata } from "next";
import siteMetadata from "@/data/siteMetadata";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import HomeFAQ from "@/components/HomeFAQ";
import NewsletterForm from "@/components/NewsletterForm";
import HomeBanners from "@/components/HomeBanners";
import { getBanners } from "@/lib/content/contentProvider";

export const metadata: Metadata = {
  title: "Code with Ahsan | Developer Community & Tutorials",
  description:
    "Join the free developer community to learn web development, find mentorship, and build awesome projects.",
  openGraph: {
    title: "Code with Ahsan | Developer Community & Tutorials",
    description:
      "Join the free developer community to learn web development, find mentorship, and build awesome projects.",
    images: ["/images/home-og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Code with Ahsan | Developer Community & Tutorials",
    description:
      "Join the free developer community to learn web development, find mentorship, and build awesome projects.",
    images: ["/images/home-og.png"],
  },
};

async function getHomeBanners() {
  if (process.env.NEXT_PUBLIC_SHOW_BANNERS !== "true") return [];
  return getBanners();
}

export default async function Home() {
  const banners = await getHomeBanners();

  return (
    <>
      <section className="page-padding border-t border-base-300 relative bg-base-100">
        <HomeBanners banners={banners} />
      </section>

      <Hero />

      <Features />

      <HomeFAQ />

      <section className="py-16 page-padding border-t border-base-300 relative bg-base-100">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(143,39,224,0.05)_0%,transparent_70%)]"></div>
        <div className="relative z-10 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-base-content">
            Join the <span className="text-accent">Community</span>
          </h2>
          <p className="text-base-content/70 max-w-xl mx-auto mb-8">
            Get the latest tutorials, articles, and course updates delivered
            straight to your inbox. No spam, just code.
          </p>

          {siteMetadata.newsletter.provider !== "" && (
            <div className="max-w-md mx-auto">
              <NewsletterForm />
            </div>
          )}
        </div>
      </section>
    </>
  );
}
