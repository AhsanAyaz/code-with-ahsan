import React from 'react'
import Link from 'next/link'

const PostsList = ({ chapter, courseSlug, post }) => {
  return (
    <ul className="flex flex-col gap-2">
      {chapter.posts.map((chapterPost, index) => {
        return (
          <Link passHref key={index} href={`/courses/${courseSlug}/${chapterPost.slug}`}>
            <li
              className={`px-4 py-2 dark:bg-gray-700 dark:text-white dark:hover:bg-[#6366f1] cursor-pointer bg-gray-100 rounded-md hover:bg-[#6366f1] hover:text-white ${
                post?.id === chapterPost.id ? 'bg-[#6366f1] dark:bg-[#6366f1]' : ''
              } `}
            >
              <a className="break-words">{chapterPost.title}</a>
            </li>
          </Link>
        )
      })}
    </ul>
  )
}

export default PostsList
