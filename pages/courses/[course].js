import siteMetadata from '@/data/siteMetadata'
import { PageSEO } from '@/components/SEO'
import axios from 'axios'
import qs from 'qs'
import Course from '../../classes/Course.class'
import PostsList from '../../components/courses/PostsList'
import { useReducer, useEffect } from 'react'
import { postsReducer } from '../../services/PostService'
import LegitMarkdown from '../../components/LegitMarkdown'
import Image from 'next/image'
import STRAPI_CONFIG from '../../lib/strapiConfig'
import ResourcesLinks from '../../components/ResourcesLinks'
import logAnalyticsEvent from '../../lib/utils/logAnalyticsEvent'
import Link from 'next/link'

const strapiUrl = process.env.STRAPI_URL
const strapiAPIKey = process.env.STRAPI_API_KEY

export async function getStaticPaths() {
  const query = qs.stringify(
    {
      populate: ['authors', 'authors.avatar'],
      publicationState: STRAPI_CONFIG.publicationState,
    },
    {
      encodeValuesOnly: true,
    }
  )
  const url = `${strapiUrl}/api/courses?${query}`
  const coursesResp = await axios.get(url, {
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      Authorization: `Bearer ${strapiAPIKey}`,
    },
  })
  const courses = coursesResp.data.data.map((course) => new Course(course))
  const config = {
    paths: courses.map((course) => ({
      params: {
        course: course.slug,
      },
    })),
    fallback: false,
  }
  return config
}

export async function getStaticProps({ params }) {
  const courseId = params.course

  const query = qs.stringify(
    {
      populate: ['authors', 'authors.avatar', 'chapters', 'chapters.posts', 'banner', 'resources'],
      publicationState: STRAPI_CONFIG.publicationState,
    },
    {
      encodeValuesOnly: true,
    }
  )
  const url = `${strapiUrl}/api/courses/${courseId}?${query}`
  const coursesResp = await axios.get(url, {
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      Authorization: `Bearer ${strapiAPIKey}`,
    },
  })
  const course = new Course(coursesResp.data.data)
  return { props: { courseStr: JSON.stringify(course) } }
}

export default function CoursePage({ courseStr }) {
  const course = JSON.parse(courseStr)
  const [state, dispatch] = useReducer(postsReducer, { completedPosts: {} })
  useEffect(() => {
    dispatch({
      type: 'RETRIEVE_COMPLETED_POSTS',
    })
    logAnalyticsEvent('course_viewed', {
      courseSlug: course.slug,
    })
  }, [course.slug])
  return (
    <>
      <PageSEO
        title={course.name}
        imageUrl={course.banner}
        description={course.description || siteMetadata.description}
      />
      <header className="text-5xl text-center mb-6 font-bold">
        <h1>{course.name}</h1>
        <div className="my-4">
          {course.banner && (
            <Image
              width={900}
              height={400}
              objectFit={'contain'}
              alt={`${course.name} banner`}
              src={course.banner}
            />
          )}
        </div>
      </header>
      <div className="mb-6">
        <LegitMarkdown>{course.description}</LegitMarkdown>
      </div>
      <div className="mb-6">
        <LegitMarkdown>{course.outline}</LegitMarkdown>
      </div>
      {course?.chapters?.length ? (
        <div className="chapters">
          <h4 className="text-center mb-6 font-bold">Chapters</h4>
          <article>
            {course.chapters.map((chapter, index) => {
              return (
                <section key={index} className="mb-2">
                  {chapter.showName && (
                    <div className="mb-4 text-base font-bold">{chapter.name}</div>
                  )}
                  <PostsList
                    chapter={chapter}
                    courseSlug={course.slug}
                    completedPosts={state.completedPosts}
                  />
                </section>
              )
            })}
          </article>
        </div>
      ) : null}
      {course.resources?.length ? (
        <div className="resources mt-6">
          <ResourcesLinks
            headingClasses="text-center mb-6 font-bold"
            resources={course.resources}
          />
        </div>
      ) : null}

      <div>
        <h4 className="my-6 text-center font-bold">Project Submissions</h4>
        <Link passHref href={`/courses/${course.slug}/submissions`}>
          <li
            className={`flex items-center gap-4 justify-between px-4 py-2 dark:bg-gray-700 dark:text-white dark:hover:bg-[#6366f1] cursor-pointer bg-gray-100 rounded-md hover:bg-[#6366f1] hover:text-white`}
          >
            <a className="break-words">View Submissions</a>
          </li>
        </Link>
      </div>
    </>
  )
}

CoursePage.showAds = true
