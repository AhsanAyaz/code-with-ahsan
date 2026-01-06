import siteMetadata from "@/data/siteMetadata";
import qs from "qs";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import NewsletterForm from "@/components/NewsletterForm";
import HomeBanners from "@/components/HomeBanners";

// Mock fetch for banners - TODO: Implement actual data fetching via Server Action or API
async function getBanners() {
  if (process.env.NEXT_PUBLIC_SHOW_BANNERS !== "true") return [];

  const STRAPI_URL =
    process.env.STRAPI_URL ||
    process.env.NEXT_PUBLIC_STRAPI_API_URL ||
    "https://strapi-production-7b84.up.railway.app";
  const query = qs.stringify(
    {
      sort: ["id:ASC"],
      pagination: {
        page: 1,
        pageSize: 10,
      },
    },
    {
      encodeValuesOnly: true,
    }
  );

  try {
    const res = await fetch(`${STRAPI_URL}/api/banners?${query}`, {
      next: { revalidate: 60 },
      headers: {
        Authorization: `Bearer ${process.env.STRAPI_API_KEY ?? ""}`,
      },
    });

    if (!res.ok) {
      return [];
    }

    const json = await res.json();
    const data = json.data;

    // Handle Strapi v4 (attributes) vs v5 (flat) vs array
    if (!Array.isArray(data)) return [];

    return data
      .map((item: any) => {
        const attr = item.attributes || item;
        return {
          content: attr.content,
          isActive: attr.isActive ?? true,
          dismissable: attr.dismissable ?? false,
        };
      })
      .filter((item: any) => item.isActive);
  } catch (error) {
    console.error("Error fetching banners:", error);
    return [];
  }
}

export default async function Home() {
  const banners = await getBanners();

  // Inject New Year Sale Banner
  banners.unshift({
    content:
      "🎉 **New Year Sale!** Get [Mastering Angular Signals](https://leanpub.com/mastering-angular-signals/c/GO2026) at **75% OFF** until Jan 5th! (Includes future Signal Forms update). Happy New Year!",
    isActive: true,
    dismissable: true,
  });

  return (
    <>
      <section className="px-4 sm:px-8 md:px-12 lg:px-16 border-t border-base-300 relative bg-base-100">
        <HomeBanners banners={banners} />
      </section>

      <Hero />

      <Features />

      {/* Newsletter Section */}
      <section className="py-16 px-4 sm:px-8 md:px-12 lg:px-16 border-t border-base-300 relative bg-base-100">
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
