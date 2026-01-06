import React from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck, faLock } from "@fortawesome/free-solid-svg-icons";

const PostsList = ({
  chapter,
  course,
  post,
  completedPosts = {},
  enrolled,
  enrollUser,
}) => {
  const courseSlug = course.slug;
  if (!chapter.posts.length) {
    return (
      <ul className="flex flex-col gap-2">
        <li
          key={1}
          className="flex items-center gap-4 justify-between px-4 py-2 bg-gray-700 text-white backdrop-blur border border-gray-600 hover:border-primary/40 transition-colors rounded-lg shadow-lg"
        >
          -
        </li>
      </ul>
    );
  }
  return (
    <ul className="flex flex-col gap-2 mb-4">
      {chapter.posts.map((chapterPost, index) => {
        return enrolled ? (
          <Link
            passHref
            key={index}
            href={`/courses/${courseSlug}/${chapterPost.slug}`}
          >
            <li
              className={`flex cursor-pointer items-center gap-4 justify-between px-4 py-2 backdrop-blur border border-gray-600 hover:border-primary transition-colors rounded-lg shadow-lg ${
                post?.id === chapterPost.id
                  ? "bg-primary text-white"
                  : "bg-gray-700 text-white hover:bg-gray-600"
              }`}
            >
              <span className="break-words">{chapterPost.title}</span>
              <div className="flex items-center gap-2">
                {completedPosts[chapterPost.slug] && (
                  <FontAwesomeIcon
                    icon={faCircleCheck}
                    className="text-primary"
                  />
                )}
                <svg
                  className="w-5 h-5 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </li>
          </Link>
        ) : (
          <button
            key={`${index}_button`}
            onClick={() => {
              alert("Please enroll to access the video");
              enrollUser();
            }}
            className="flex items-center gap-4 justify-between px-4 py-2 bg-gray-700 text-white backdrop-blur border border-gray-600 hover:border-primary hover:bg-gray-600 transition-colors rounded-lg shadow-lg"
          >
            <span className="break-words">{chapterPost.title}</span>
            <FontAwesomeIcon icon={faLock} className="text-gray-400" />
          </button>
        );
      })}
    </ul>
  );
};

export default PostsList;
