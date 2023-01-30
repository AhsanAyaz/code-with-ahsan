import React, { useCallback, useEffect, useState } from 'react'
import format from 'date-fns/format'
import Link from 'next/link'
import LegitMarkdown from '../LegitMarkdown'
import Image from 'next/image'

import { getFirestore, doc, getDoc } from 'firebase/firestore'
import { getApp } from 'firebase/app'

const firestore = getFirestore(getApp())

const CourseCard = ({ course, enrollHandler, user }) => {
  const { banner } = course
  const [enrolled, setEnrolled] = useState(false)

  const getEnrollment = useCallback(async () => {
    const enrollmentRef = doc(firestore, `enrollment/${course.slug}_${user.uid}`)
    const existingCourse = await getDoc(enrollmentRef)
    setEnrolled(existingCourse.exists())
  }, [user, course.slug])

  useEffect(() => {
    if (user) {
      getEnrollment()
    } else {
      setEnrolled(false)
    }
  }, [user, getEnrollment])

  return (
    <Link passHref href={`/courses/${course.slug}`}>
      <div className="block p-4 overflow-hidden border transition ease-in-out duration-150 border-gray-600 rounded-md shadow-md relative hover:-translate-y-1 hover:shadow-lg hover:cursor-pointer">
        <span className="absolute inset-x-0 bottom-0 h-2  bg-gradient-to-r from-emerald-300 via-blue-500 to-purple-600"></span>
        {banner && (
          <div className="mb-4">
            <Image
              width={900}
              height={400}
              src={banner}
              objectFit={'cover'}
              alt={`${course.name} banner`}
            />
          </div>
        )}
        <h5 className="text-base lg:text-2xl mb-4 text-center font-bold text-gray-900 dark:text-gray-200">
          {course.name}
        </h5>
        <div className="mb-8 text-sm lg:text-base text-center sm:pr-8">
          <LegitMarkdown>{course.description}</LegitMarkdown>
        </div>

        <button
          onClick={(event) => {
            if (enrolled) {
              return
            }
            event.stopPropagation()
            enrollHandler(course)
          }}
          className="px-4 text-white uppercase mb-6 hover:bg-yellow-500 hover:shadow-md py-3 w-full bg-yellow-400 dark:bg-yellow-500 dark:hover:bg-yellow-600"
        >
          {enrolled ? 'Continue' : 'Enroll'}
        </button>

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
