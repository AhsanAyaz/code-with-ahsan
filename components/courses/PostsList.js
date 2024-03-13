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
          className={`flex items-center gap-4 justify-between px-4 py-2 dark:bg-gray-700 dark:text-white bg-gray-100 rounded-md `}
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
              className={`flex items-center gap-4 justify-between px-4 py-2 dark:bg-gray-700 dark:text-white dark:hover:bg-primary-800 cursor-pointer bg-gray-100 rounded-md hover:bg-primary-500 hover:text-white ${
                post?.id === chapterPost.id ? 'bg-primary-500 dark:bg-primary-800 text-white' : ''
              } `}
            >
              <a className="break-words">{chapterPost.title}</a>
              {completedPosts[chapterPost.slug] && (
                <FontAwesomeIcon
                  icon={faCircleCheck}
                  className={'dark:text-yellow-300 text-yellow-400'}
                />
              )}
            </li>
          </Link>
        ) : (
          <button
            key={`${index}_button`}
            onClick={() => {
              alert('Please enroll to access the video')
              enrollUser()
            }}
            className={`flex items-center gap-4 justify-between px-4 py-2 dark:bg-gray-700 dark:text-white dark:hover:bg-primary-800  bg-gray-200 rounded-md `}
          >
            <span className="break-words">{chapterPost.title}</span>
            <FontAwesomeIcon icon={faLock} className={'dark:text-gray-300 text-gray-400'} />
          </button>
        )
      })}
    </ul>
  )
}

export default PostsList
