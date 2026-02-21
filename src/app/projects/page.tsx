import { Metadata } from "next";
// @ts-ignore
import siteMetadata from "@/data/siteMetadata";
// @ts-ignore
import projectsData from "@/data/projectsData";
// @ts-ignore
import Card from "@/components/Card";

export const metadata: Metadata = {
  title: `Projects - ${siteMetadata.title}`,
  description:
    "Explore the various coding projects, tutorials, and open-source contributions by the Code with Ahsan community.",
  openGraph: {
    title: `Projects - ${siteMetadata.title}`,
    description:
      "Explore the various coding projects, tutorials, and open-source contributions by the Code with Ahsan community.",
    images: ["/images/projects-og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: `Projects - ${siteMetadata.title}`,
    description:
      "Explore the various coding projects, tutorials, and open-source contributions by the Code with Ahsan community.",
    images: ["/images/projects-og.png"],
  },
};

export default function Projects() {
  return (
    <div className="page-padding">
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        <div className="pt-6 pb-8 space-y-2 md:space-y-5">
          <h1 className="text-3xl font-extrabold leading-9 tracking-tight text-base-content sm:text-4xl sm:leading-10 md:text-6xl md:leading-14">
            Projects
          </h1>
          <p className="text-lg leading-7 text-base-content/70">
            Showcase your projects with a hero image (16 x 9)
          </p>
        </div>
        <div className="container py-12">
          <div className="flex flex-wrap -m-4">
            {projectsData.map((d: any) => (
              <Card
                key={d.title}
                title={d.title}
                description={d.description}
                imgSrc={d.imgSrc}
                href={d.href}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
