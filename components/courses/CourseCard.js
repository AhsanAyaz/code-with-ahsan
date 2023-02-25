import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import LegitMarkdown from '../LegitMarkdown'
import Image from 'next/image'

import {
  getFirestore,
  doc,
  getDoc,
  query,
  collection,
  where,
  getCountFromServer,
} from 'firebase/firestore'
import { getApp } from 'firebase/app'

const db = getFirestore(getApp())

const CourseCard = ({ course, enrollHandler, user }) => {
  const { banner } = course
  const [enrolled, setEnrolled] = useState(null)
  const [enrollmentCount, setEnrollmentCount] = useState(null)

  const getEnrollment = useCallback(async () => {
    const enrollmentRef = doc(db, `enrollment/${course.slug}_${user.uid}`)
    const existingCourse = await getDoc(enrollmentRef)
    setEnrolled(existingCourse.exists())
  }, [user, course.slug])

  const getGetEnrollmentCount = useCallback(async () => {
    const q = query(collection(db, 'enrollment'), where('courseId', '==', course.slug))
    const snapshot = await getCountFromServer(q)
    setEnrollmentCount(snapshot.data().count)
  }, [course.slug])

  useEffect(() => {
    if (user) {
      getEnrollment()
    } else if (enrolled) {
      setEnrolled(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, getEnrollment])

  useEffect(() => {
    getGetEnrollmentCount()
  }, [getGetEnrollmentCount])

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
        <h5 className="text-base lg:text-2xl mb-4 line-clamp-1 text-center font-bold text-gray-900 dark:text-gray-200">
          {course.name}
        </h5>
        <div className="text-sm text-center lg:text-base line-clamp-3 text-ellipsis">
          <LegitMarkdown>{course.description}</LegitMarkdown>
        </div>
        <p className="text-center mt-4 mb-8">
          {enrollmentCount !== null ? `${enrollmentCount} students enrolled` : '...'}
        </p>
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
      </div>
    </Link>
  )
}

export default CourseCard
