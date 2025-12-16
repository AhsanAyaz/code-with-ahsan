import siteMetadata from "@/data/siteMetadata";
import Image from "next/image";
import SocialIcon from "@/components/social-icons";
import NewsletterForm from "@/components/NewsletterForm";
import AboutContent from "@/components/AboutContent";
import Link from "next/link";
import LegitMarkdown from "@/components/LegitMarkdown";

// Mock fetch for banners - TODO: Implement actual data fetching via Server Action or API
async function getBanners() {
  return [
    {
      content: "Welcome to the new site! [Check out the courses](/courses)",
      isActive: true,
    },
  ];
}

export default async function Home() {
  const banners = await getBanners();

  return (
    <>
      <div className="flex flex-col justify-center">
        {banners.map((banner: any, index: number) => (
          <div
            className="top-banner mb-4 relative bg-primary-700 text-primary-content px-6 py-3 rounded-md [&_a]:text-yellow-300 [&_a]:underline"
            key={index}
          >
            <span className="animate-ping absolute -right-1 -top-1 inline-flex h-4 w-4 rounded-full bg-yellow-700 dark:bg-yellow-300 z-10 opacity-75"></span>
            <LegitMarkdown>{banner.content}</LegitMarkdown>
          </div>
        ))}

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
                <button className="btn btn-primary bg-primary-700 border-primary-700 btn-lg w-52 lg:w-72 text-xl lg:text-2xl text-primary-content">
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
      </div>
    </>
  );
}
