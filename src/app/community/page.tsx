import { Metadata } from "next";
// @ts-ignore
import siteMetadata from "@/data/siteMetadata";
// @ts-ignore
import getAllPeople from "@/lib/people";
// @ts-ignore
import Card from "@/components/Card";

export const metadata: Metadata = {
  title: `Community - ${siteMetadata.title}`,
  description: siteMetadata.description,
};

export default async function Community() {
  const people = await getAllPeople();

  return (
    <div className="px-4 sm:px-8 md:px-12 lg:px-16">
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        <div className="pt-6 pb-8 space-y-2 md:space-y-5">
          <h1 className="text-3xl font-extrabold leading-9 tracking-tight text-base-content sm:text-4xl sm:leading-10 md:text-6xl md:leading-14">
            Community
          </h1>
          <p className="text-lg leading-7 text-base-content/70">
            Following are the amazing community members associated with
            CodeWithAhsan
          </p>
        </div>
        <div className="container py-12">
          <div className="flex flex-wrap -m-4">
            {people.map((p: any) => (
              <Card
                key={p.githubUsername}
                title={p.name}
                description={""}
                imgSrc={`https://github.com/${p.githubUsername}.png`}
                href={`https://github.com/${p.githubUsername}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
