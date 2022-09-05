import siteMetadata from '@/data/siteMetadata'
import { PageSEO } from '@/components/SEO'
import axios from 'axios'
import qs from 'qs'
import Course from '../../../classes/Course.class'
import PostsList from '../../../components/courses/PostsList'
import STRAPI_CONFIG from '../../../lib/strapiConfig'
import { useReducer, useEffect } from 'react'
import { postsReducer } from '../../../services/PostService'
import ResourcesLinks from '../../../components/ResourcesLinks'
import logAnalyticsEvent from '../../../lib/utils/logAnalyticsEvent'
import getCoursesForStaticPaths from '../../../services/CourseService'
import Link from 'next/link'
const strapiUrl = process.env.STRAPI_URL
const strapiAPIKey = process.env.STRAPI_API_KEY

export async function getStaticPaths() {
  return getCoursesForStaticPaths()
}

export async function getStaticProps({ params }) {
  const { course: courseId } = params

  const query = qs.stringify(
    {
      populate: ['authors', 'authors.avatar', 'chapters', 'chapters.posts', 'resources'],
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

export default function CourseResourcesPage({ courseStr }) {
  const course = JSON.parse(courseStr)
  const [state, dispatch] = useReducer(postsReducer, { completedPosts: {} })
  console.log({ course })
  const { resources } = course
  useEffect(() => {
    dispatch({
      type: 'RETRIEVE_COMPLETED_POSTS',
    })
    logAnalyticsEvent('course_resources_viewed', {
      courseSlug: course.slug,
    })
  }, [course.slug])
  return (
    <>
      <PageSEO
        title={`${course.name} - Resources`}
        description={course.description || siteMetadata.description}
      />
      <div className="flex gap-12 flex-col-reverse md:grid md:grid-cols-3 md:gap-4">
        <aside className="chapters col-span-1">
          {course &&
            course.chapters.map((chapter, index) => {
              return (
                <section key={index} className="mb-2">
                  {chapter.showName && (
                    <div className="mb-4 text-left md:text-center text-base font-bold">
                      {chapter.name}
                    </div>
                  )}
                  <PostsList
                    chapter={chapter}
                    courseSlug={course.slug}
                    completedPosts={state.completedPosts}
                  />
                </section>
              )
            })}
          {course.resources?.length ? (
            <div className="my-6">
              <h5 className="text-center md:text-left mb-4">Resources</h5>
              <Link passHref href={`/courses/${course.slug}/resources`}>
                <li
                  className={`flex items-center gap-4 justify-between px-4 py-2 cursor-pointer rounded-md bg-[#6366f1] text-white`}
                >
                  <a className="break-words">View Resources</a>
                </li>
              </Link>
            </div>
          ) : null}
          <div className="my-6">
            <h5 className="text-center md:text-left mb-4">Project Submissions</h5>
            <Link passHref href={`/courses/${course.slug}/submissions`}>
              <li
                className={`flex items-center gap-4 justify-between px-4 py-2 dark:bg-gray-700 dark:text-white dark:hover:bg-[#6366f1] cursor-pointer bg-gray-100 rounded-md hover:bg-[#6366f1] hover:text-white`}
              >
                <a className="break-words">View Submissions</a>
              </li>
            </Link>
          </div>
        </aside>
        <main className="flex-1 md:min-h-[300px] col-span-2">
          <ResourcesLinks resources={resources} />
        </main>
      </div>
    </>
  )
}

CourseResourcesPage.showAds = true
