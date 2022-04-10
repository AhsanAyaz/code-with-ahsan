import React, { useCallback } from 'react'
import format from 'date-fns/format'
import Link from 'next/link'
import LegitMarkdown from '../LegitMarkdown'
const CourseCard = ({ course }) => {
  const getAuthorName = useCallback(() => {
    const authors = course.authors.map((author) => author.name).join(', ')
    return authors
  }, [course])
  return (
    <Link passHref href={`/courses/${course.slug}`}>
      <div className="relative block p-8 overflow-hidden border border-gray-100 rounded-lg hover:shadow-md hover:cursor-pointer">
        <span className="absolute inset-x-0 bottom-0 h-2  bg-gradient-to-r from-green-300 via-blue-500 to-purple-600"></span>

        <div className="justify-between sm:flex">
          <div>
            <h5 className="text-xl font-bold text-gray-900 dark:text-gray-200">{course.name}</h5>
            <p className="mt-1 text-xs font-medium text-gray-600 dark:text-gray-400">
              By {getAuthorName()}
            </p>
          </div>

          <div className="flex-shrink-0 hidden ml-3 sm:block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="object-cover w-16 h-16 rounded-lg shadow-sm"
              src={course.authors[0].avatar}
              alt="placeholder"
            />
          </div>
        </div>

        <div className="mt-4 sm:pr-8 max-h-32 line-clamp-3">
          <LegitMarkdown>{course.description}</LegitMarkdown>
        </div>

        <dl className="flex mt-6">
          <div className="flex flex-col-reverse">
            <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">Published</dt>
            <dd className="text-xs text-gray-500 dark:text-gray-300">
              {format(new Date(course.publishedAt), 'MM/dd/yyyy')}
            </dd>
          </div>

          {course.duration && (
            <div className="flex flex-col-reverse ml-3 sm:ml-6">
              <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Course Duration
              </dt>
              <dd className="text-xs text-gray-500 dark:text-gray-300">{course.duration}</dd>
            </div>
          )}
        </dl>
      </div>
    </Link>
  )
}

export default CourseCard
