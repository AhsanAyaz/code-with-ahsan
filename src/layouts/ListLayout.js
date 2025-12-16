"use client";
import Link from "@/components/Link";
import Tag from "@/components/Tag";
import { useState } from "react";
import Pagination from "@/components/Pagination";
import formatDate from "@/lib/utils/formatDate";
import Image from "next/image";
import { useRouter } from "next/router";

export default function ListLayout({
  posts,
  title,
  initialDisplayPosts = [],
  pagination,
}) {
  const [searchValue, setSearchValue] = useState("");
  const filteredBlogPosts = posts.filter((frontMatter) => {
    const searchContent =
      frontMatter.title + frontMatter.summary + frontMatter.tags.join(" ");
    return searchContent.toLowerCase().includes(searchValue.toLowerCase());
  });

  const router = useRouter();

  async function spaNavigate(link, e) {
    const coverImage = e.currentTarget
      .closest("article")
      .querySelector(".post-cover-image");
    if (!document.startViewTransition || !coverImage) {
      router.push(link);
      return;
    }

    const x = e?.clientX ?? innerWidth / 2;
    const y = e?.clientY ?? innerHeight / 2;
    const endRadius = Math.hypot(
      Math.max(x, innerWidth - x),
      Math.max(y, innerHeight - y)
    );

    coverImage.style.viewTransitionName = "banner-img";

    const transition = document.startViewTransition(async () => {
      await router.push(link);
      coverImage.style.viewTransitionName = "";
    });

    await transition.ready;
  }

  // If initialDisplayPosts exist, display it if no searchValue is specified
  const displayPosts =
    initialDisplayPosts.length > 0 && !searchValue
      ? initialDisplayPosts
      : filteredBlogPosts;

  return (
    <>
      <div className="divide-y">
        <div className="pt-6 pb-8 space-y-2 md:space-y-5">
          <h1 className="text-3xl font-extrabold leading-9 tracking-tight text-base-content sm:text-4xl sm:leading-10 md:text-6xl md:leading-14">
            {title}
          </h1>
          <div className="relative max-w-lg">
            <input
              aria-label="Search articles"
              type="text"
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search articles"
              className="block w-full px-4 py-2 text-base-content bg-white border border-gray-300 rounded-md dark:border-gray-900 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800"
            />
            <svg
              className="absolute w-5 h-5 text-gray-400 right-3 top-3 dark:text-gray-300"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>
        <ul>
          {!filteredBlogPosts.length && "No posts found."}
          {displayPosts.map((frontMatter, i) => {
            const { slug, date, title, summary, images, tags } = frontMatter;
            let image =
              images && images[0]
                ? images[0]
                : `/static/images/${slug}/seo.jpg`;
            if (image.endsWith("seo.jpg")) {
              image = "";
            }
            return (
              <li key={slug} className="py-4 blog-post-item mb-12">
                <article className="space-y-2 xl:grid xl:grid-cols-4 xl:space-y-0 xl:items-baseline">
                  <dl>
                    <dt className="sr-only">Published on</dt>
                    <dd className="text-base font-medium leading-6 text-gray-500 dark:text-gray-400">
                      <time dateTime={date}>{formatDate(date)}</time>
                    </dd>
                  </dl>
                  <div className="space-y-3 xl:col-span-3">
                    {image && (
                      <div
                        role={"button"}
                        aria-hidden={true}
                        onClick={(e) => spaNavigate(`/blog/${slug}`, e)}
                        className="post-cover-image space-y-6 aspect-video h-54 block relative"
                      >
                        <Image fill alt={slug} src={image} />
                      </div>
                    )}

                    <div>
                      <div
                        tabIndex={i}
                        role={"button"}
                        onClick={(e) => spaNavigate(`/blog/${slug}`, e)}
                        aria-hidden="true"
                      >
                        <h2 className="text-2xl font-bold leading-8 tracking-tight">
                          {title}
                        </h2>
                      </div>
                      <div className="text-gray-500 my-4 max-w-none dark:text-gray-400">
                        {summary}
                      </div>
                      <div className="flex flex-wrap">
                        {tags.map((tag) => (
                          <Tag key={tag} text={tag} />
                        ))}
                      </div>
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      </div>
      {pagination && pagination.totalPages > 1 && !searchValue && (
        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
        />
      )}
    </>
  );
}
