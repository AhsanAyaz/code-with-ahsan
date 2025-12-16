'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import axios from 'axios'
import qs from 'qs'
// @ts-ignore
import Course from '@/classes/Course.class'
// @ts-ignore
import { STRAPI_COURSE_POPULATE_OBJ } from '@/lib/strapiQueryHelpers'
// @ts-ignore
import ResourcesLinks from '@/components/ResourcesLinks'
// @ts-ignore
import Spinner from '@/components/Spinner'

const strapiUrl =
  process.env.NEXT_PUBLIC_STRAPI_URL || 'https://strapi-production-7b84.up.railway.app'
const strapiAPIKey =
  process.env.STRAPI_API_KEY ||
  '2d28dddc977ac98d7e4e55b2f5cd7e1302d22f3e9033f705cb918185d5d178fd95768ae1d7e8406714022bccddc7c91a394fee9e276eba87b0e047948b22e4be58f0e97bd6e5295f52dd24fd943ad67fb0f85e7bc2d1a6487753cc704a160761b29ef8dda04f04c31fac2c1b9620103afe7a0eba541108738a5fc46c4083485d'

export default function ResourcesPage() {
  const params = useParams()
  const courseSlug = params.course

  const [course, setCourse] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Fetch Course Details
  useEffect(() => {
    if (!courseSlug) return

    async function fetchCourse() {
      try {
        const queryStr = qs.stringify(
          {
            filters: {
              slug: {
                $eq: courseSlug,
              },
            },
            populate: STRAPI_COURSE_POPULATE_OBJ,
          },
          {
            encodeValuesOnly: true,
          }
        )
        const url = `${strapiUrl}/api/courses?${queryStr}`
        const coursesResp = await axios.get(url, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${strapiAPIKey}`,
          },
        })

        if (coursesResp.data.data && coursesResp.data.data.length > 0) {
          const courseObj = new Course(coursesResp.data.data[0])
          setCourse(courseObj)
        }
      } catch (e) {
        console.error('Failed to fetch course', e)
      } finally {
        setLoading(false)
      }
    }
    fetchCourse()
  }, [courseSlug])

  if (loading) {
    return (
      <div className="flex justify-center p-10">
        <Spinner color="primary" />
      </div>
    )
  }

  if (!course) {
    return <div className="text-center p-10">Course not found</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-6">
        <h1 className="text-4xl text-center">Resources</h1>
        <h2 className="text-xl mt-2 text-center text-base-content/70">{course.name}</h2>
      </header>

      <div className="max-w-4xl mx-auto">
        <ResourcesLinks noHeading={true} heading="" resources={course.resources} />
      </div>
    </div>
  )
}
