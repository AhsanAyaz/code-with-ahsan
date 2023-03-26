import React, { useReducer } from 'react'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleCheck } from '@fortawesome/free-solid-svg-icons'

const PostsList = ({ chapter, courseSlug, post, completedPosts = {} }) => {
  if (!chapter.posts.length) {
    return (
      <ul className="flex flex-col gap-2">
        <li
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
        return (
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
        )
      })}
    </ul>
  )
}

export default PostsList
