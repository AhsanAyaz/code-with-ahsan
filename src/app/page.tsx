import siteMetadata from "@/data/siteMetadata";
import qs from "qs";
import Image from "next/image";
import SocialIcon from "@/components/social-icons";
import NewsletterForm from "@/components/NewsletterForm";
import AboutContent from "@/components/AboutContent";
import Link from "next/link";
import LegitMarkdown from "@/components/LegitMarkdown";
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
      <HomeBanners banners={banners} />

      <div className="flex flex-col justify-center">
        <div className="flex flex-col md:flex-row items-center mb-16 px-24 md:px-0 relative">
          <Image
            src="/static/images/banner-dev.webp"
            alt="banner dev"
            width={800}
            height={800}
            className="w-84 md:w-auto md:flex-1"
            style={{ objectFit: "contain" }}
            property="true"
          />

          <div className="flex flex-col pr-6 py-10 bottom-0 top-0 items-center md:items-end justify-center h-full w-full gap-4">
            <Link href={"/courses"}>
              <button className="btn btn-primary bg-primary border-primary btn-lg w-52 lg:w-72 text-xl lg:text-2xl text-primary-content">
                Take a Course
              </button>
            </Link>
            <Link href={"https://blog.codewithahsan.dev/"}>
              <button className="btn btn-neutral btn-lg w-52 lg:w-72 text-xl lg:text-2xl text-white">
                Read the Blog
              </button>
            </Link>
          </div>
        </div>

        <figure className="md:flex bg-base-200 rounded-xl p-8 md:p-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="w-24 h-24 md:w-48 md:h-auto md:rounded-none md:rounded-l-xl object-cover rounded-full mx-auto"
            src={siteMetadata.image}
            alt=""
            width="384"
            height="512"
          />
          <div className="pt-6 md:p-8 text-center md:text-left space-y-4">
            <blockquote>
              <AboutContent />
            </blockquote>
          </div>
        </figure>

        <div className="text-center mt-5 parent-container">
          <div className="inline-flex gap-10 icons-container my-8">
            <SocialIcon kind="twitch" href={siteMetadata.twitch} size={42} />
            <SocialIcon
              color="text-red-700"
              kind="youtube"
              href={siteMetadata.youtube}
              size={42}
            />
            <SocialIcon kind="github" href={siteMetadata.github} size={42} />
          </div>
        </div>

        {siteMetadata.newsletter.provider !== "" && (
          <div className="flex items-center justify-center pt-4">
            <NewsletterForm />
          </div>
        )}

        <div className="text-sm text-center mt-10">
          <a href="https://www.vecteezy.com/free-vector/human">
            Human Vectors by Vecteezy
          </a>
        </div>
      </div>
    </>
  );
}
