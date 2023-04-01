import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import LegitMarkdown from '../LegitMarkdown'
import Image from 'next/image'

import { getFirestore, query, collection, where, getCountFromServer } from 'firebase/firestore'
import { getApp } from 'firebase/app'
import { getIsEnrolled } from '../../services/EnrollmentService'
import Button from '../Button'
import { useRouter } from 'next/router'

const db = getFirestore(getApp())

const CourseCard = ({ course, enrollHandler, user }) => {
  const { banner } = course
  const [enrolled, setEnrolled] = useState(null)
  const [enrollmentCount, setEnrollmentCount] = useState(null)
  const router = useRouter()
  const getEnrollment = useCallback(async () => {
    const enrolled = await getIsEnrolled(course.slug, user.uid)
    setEnrolled(enrolled)
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

  async function spaNavigate(link, e) {
    const coverImage = e.currentTarget.querySelector('img')
    if (!document.startViewTransition || !coverImage) {
      router.push(link)
      return
    }
    coverImage.style.viewTransitionName = 'banner-img'

    const x = e?.clientX ?? innerWidth / 2
    const y = e?.clientY ?? innerHeight / 2
    const endRadius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))

    const transition = document.startViewTransition(async () => {
      await router.push(link)
      coverImage.style.viewTransitionName = ''
    })

    await transition.ready

    // Circle clip out animation
    // Animate the root's new view
    // document.documentElement.animate(
    //   {
    //     clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`],
    //   },
    //   {
    //     duration: 500,
    //     easing: 'ease-in',
    //     // Specify which pseudo-element to animate
    //     pseudoElement: '::view-transition-new(root)',
    //   }
    // )
  }

  return (
    <div
      role={'button'}
      aria-hidden={true}
      onClick={(e) => {
        spaNavigate(`/courses/${course.slug}`, e)
      }}
    >
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
        <Button
          onClick={(event) => {
            if (enrolled) {
              return
            }
            event.stopPropagation()
            enrollHandler(course)
          }}
          color="accent"
          className="px-4 uppercase mb-6 py-3 w-full border-none rounded-none"
        >
          {enrolled ? 'Continue' : 'Enroll'}
        </Button>
      </div>
    </div>
  )
}

export default CourseCard
