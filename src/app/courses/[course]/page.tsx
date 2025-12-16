import qs from 'qs'
import { notFound } from 'next/navigation'
// @ts-ignore
import { STRAPI_COURSE_POPULATE_OBJ } from '@/lib/strapiQueryHelpers'
// @ts-ignore
import Course from '@/classes/Course.class'
import CourseDetail from './CourseDetail'
import siteMetadata from '@/data/siteMetadata'

async function getCourse(slug: string) {
  const strapiUrl = process.env.STRAPI_URL
  const strapiAPIKey = process.env.STRAPI_API_KEY

  if (!strapiUrl || !strapiAPIKey) {
    console.warn('Strapi URL or API Key missing. Returning null.')
    return null
  }

  const query = qs.stringify(
    {
      populate: STRAPI_COURSE_POPULATE_OBJ,
      filters: {
        slug: {
          $eq: slug,
        },
      },
    },
    {
      encodeValuesOnly: true,
    }
  )

  const url = `${strapiUrl}/api/courses?${query}`

  try {
    const coursesResp = await fetch(url, {
      headers: {
        Authorization: `Bearer ${strapiAPIKey}`,
      },
      next: { revalidate: 60 },
    })

    if (!coursesResp.ok) return null

    const data = await coursesResp.json()
    if (!data.data.length) return null

    const course = new Course(data.data[0])
    course.chapters.sort((a: any, b: any) => a.order - b.order)
    return course
  } catch (error) {
    console.error('Error fetching course:', error)
    return null
  }
}

export async function generateMetadata({ params }: { params: Promise<{ course: string }> }) {
  const { course: slug } = await params
  const course = await getCourse(slug)

  if (!course) {
    return {
      title: 'Course Not Found',
      description: 'The requested course could not be found.',
    }
  }

  return {
    title: `${course.name} - ${siteMetadata.title}`,
    description: course.description || siteMetadata.description,
    openGraph: {
      title: course.name,
      description: course.description || siteMetadata.description,
      images: course.banner ? [course.banner] : [],
    },
  }
}

export default async function Page({ params }: { params: Promise<{ course: string }> }) {
  const { course: slug } = await params
  const course = await getCourse(slug)

  if (!course) {
    notFound()
  }

  // Pass course as JSON serializable object if class is not simple json
  // But Course class constructs a plain object mostly, except methods?
  // Next.js server components to client components props must be serializable.
  // The Course class has methods? Let's check.
  // It has a constructor. If it has prototypes methods, those won't pass.
  // We can pass {...course} to mimic serialization or use JSON.parse(JSON.stringify(course))
  const coursePlain = JSON.parse(JSON.stringify(course))

  return <CourseDetail course={coursePlain} />
}
