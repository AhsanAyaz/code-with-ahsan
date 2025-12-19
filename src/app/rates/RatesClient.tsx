"use client";

import LegitMarkdown from "@/components/LegitMarkdown";
import ResourcesLinks from "@/components/ResourcesLinks";

export default function RatesClient({ post }: { post: any }) {
  return (
    <>
      <header className="mb-6">
        <h1 className="text-4xl text-center">
          {post.title || "Creator Rate Card"}
        </h1>
      </header>

      {post.description && (
        <section className="mt-8 mb-4">
          <p>{post.description}</p>
        </section>
      )}

      {post.article && (
        <section>
          <LegitMarkdown
            components={{
              a: (props: any) => (
                <a
                  className="text-yellow-300"
                  target={"_blank"}
                  rel="noreferrer"
                  {...props}
                >
                  {props.children}
                </a>
              ),
            }}
          >
            {post.article}
          </LegitMarkdown>
        </section>
      )}

      {post.resources?.length > 0 && (
        <section className="mt-4">
          <ResourcesLinks
            resources={post.resources}
            heading="Resources"
            noHeading={false}
          />
        </section>
      )}
    </>
  );
}
