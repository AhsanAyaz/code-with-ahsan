'use client'

import React, { useContext, useEffect, useState } from 'react'
// @ts-ignore
import CourseCard from '@/components/courses/CourseCard'
import { getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
// @ts-ignore
import { getCurrentUser } from '@/services/AuthService'
// @ts-ignore
import { getEnrollmentDoc } from '@/services/EnrollmentService'
// @ts-ignore
import { AuthContext } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'

// const auth = getAuth(getApp())

export default function CoursesList({ coursesStr }: { coursesStr: string }) {
  const courses = JSON.parse(coursesStr)
  const router = useRouter()
  // @ts-ignore
  const [user, setUser] = useState<any>(null)
  const { setShowLoginPopup } = useContext(AuthContext)

  useEffect(() => {
    const auth = getAuth(getApp())
    const sub = auth.onAuthStateChanged((user) => {
      setUser(user)
    })
    return () => sub()
  }, [])

  const enroll = async (course: any) => {
    const attendee = await getCurrentUser()
    if (!attendee) {
      setShowLoginPopup(true)
      return
    }
    await getEnrollmentDoc({ course, attendee }, true)
    router.push(`/courses/${course.slug}`)
  }

  return (
    <div className="max-w-full mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
      {courses?.map((course: any) => (
        <CourseCard course={course} user={user} enrollHandler={enroll} key={course.id} />
      ))}
    </div>
  )
}
