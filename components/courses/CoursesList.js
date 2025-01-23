import { faChevronDown, faLock } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import React, { useEffect, useState } from 'react'
import PostsList from './PostsList'

export const CoursesList = ({ course, activePost, markedPosts = {}, enrolled, enrollUser }) => {
  const [chaptersExpansion, setChaptersExpansion] = useState({})

  useEffect(() => {
    if (!course) {
      return
    }
    const chaptersExp = course.chapters.reduce((acc, chapter) => {
      const params = {
        ...acc,
        [chapter.id]: false,
      }
      const hasActivePost = chapter.posts.find((chapterPost) => {
        return chapterPost.id === activePost?.id
      })
      if (hasActivePost) {
        params[chapter.id] = true
      }
      return params
    }, {})
    if (!activePost && course.chapters.at(0)?.id) {
      chaptersExp[course.chapters.at(0).id] = true
    }
    setChaptersExpansion(chaptersExp)
  }, [course, activePost])

  if (!course) {
    return
  }

  return (
    <>
      {course.chapters.map((chapter, index) => {
        const expanded = chaptersExpansion[chapter.id]
        return (
          <section key={index} className={`mb-2 border-b border-b-gray-200 dark:border-b-gray-700`}>
            {chapter.showName && (
              <button
                onClick={() => {
                  setChaptersExpansion({
                    ...chaptersExpansion,
                    [chapter.id]: !chaptersExpansion[chapter.id],
                  })
                }}
                className="pb-4 w-full text-base font-bold flex items-center justify-between"
              >
                <h2 className="text-base flex gap-4 items-center">
                  <span>
                    Chapter {index + 1} : {chapter.name}
                  </span>
                  {!enrolled && (
                    <FontAwesomeIcon icon={faLock} className={'dark:text-gray-300 text-gray-400'} />
                  )}
                </h2>
                <FontAwesomeIcon
                  icon={faChevronDown}
                  className={`${expanded ? 'rotate-180' : ''} duration-200`}
                />
              </button>
            )}
            {expanded ? (
              <PostsList
                chapter={chapter}
                course={course}
                post={activePost}
                enrolled={enrolled}
                completedPosts={markedPosts}
                enrollUser={enrollUser}
              />
            ) : null}
          </section>
        )
      })}
    </>
  )
}
