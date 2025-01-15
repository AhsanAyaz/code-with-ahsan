import React from 'react'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleCheck, faLock } from '@fortawesome/free-solid-svg-icons'

const PostsList = ({ chapter, course, post, completedPosts = {}, enrolled, enrollUser }) => {
  const courseSlug = course.slug
  if (!chapter.posts.length) {
    return (
      <ul className="flex flex-col gap-2">
        <li
          key={1}
          className="flex items-center gap-4 justify-between px-4 py-2 bg-gray-100 dark:bg-gray-800/50 backdrop-blur border border-primary-500/20 hover:border-primary-500/40 transition-colors rounded-lg shadow-lg"
        >
          -
        </li>
      </ul>
    )
  }
  return (
    <ul className="flex flex-col gap-2 mb-4">
      {chapter.posts.map((chapterPost, index) => {
        return enrolled ? (
          <Link passHref key={index} href={`/courses/${courseSlug}/${chapterPost.slug}`}>
            <li
              className={`flex cursor-pointer items-center gap-4 justify-between px-4 py-2 backdrop-blur border border-primary-500/20 hover:border-primary-500/40 transition-colors rounded-lg shadow-lg ${
                post?.id === chapterPost.id
                  ? 'bg-primary-500 dark:bg-primary-800 text-white'
                  : 'bg-gray-100 dark:bg-gray-800/50'
              }`}
            >
              <a className="break-words dark:text-gray-200">{chapterPost.title}</a>
              <div className="flex items-center gap-2">
                {completedPosts[chapterPost.slug] && (
                  <FontAwesomeIcon icon={faCircleCheck} className="text-primary-400" />
                )}
                <svg
                  className="w-5 h-5 text-primary-400"
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
              alert('Please enroll to access the video')
              enrollUser()
            }}
            className="flex items-center gap-4 justify-between px-4 py-2 bg-gray-100 dark:bg-gray-800/50 backdrop-blur border border-primary-500/20 hover:border-primary-500/40 transition-colors rounded-lg shadow-lg"
          >
            <span className="break-words dark:text-gray-200">{chapterPost.title}</span>
            <FontAwesomeIcon icon={faLock} className="text-gray-400" />
          </button>
        )
      })}
    </ul>
  )
}

export default PostsList
