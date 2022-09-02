import siteMetadata from '@/data/siteMetadata'
import { PageSEO } from '@/components/SEO'
import axios from 'axios'
import qs from 'qs'
import Course from '../../../classes/Course.class'
import PostsList from '../../../components/courses/PostsList'
import STRAPI_CONFIG from '../../../lib/strapiConfig'
import { useReducer, useEffect } from 'react'
import { postsReducer } from '../../../services/PostService'
import logAnalyticsEvent from '../../../lib/utils/logAnalyticsEvent'
import getCoursesForStaticPaths from '../../../services/CourseService'
import Button from '../../../components/Button'
import { getApp } from 'firebase/app'
import { getAuth, GithubAuthProvider, signInWithPopup } from 'firebase/auth'
import Dialog from '../../../components/Dialog'
import { logIn } from '../../../services/AuthService'

const strapiUrl = process.env.STRAPI_URL
const strapiAPIKey = process.env.STRAPI_API_KEY
const auth = getAuth(getApp())
const provider = new GithubAuthProvider()

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

export default function CourseSubmissionsPage({ courseStr }) {
  const course = JSON.parse(courseStr)
  const [state, dispatch] = useReducer(postsReducer, { completedPosts: {} })
  useEffect(() => {
    dispatch({
      type: 'RETRIEVE_COMPLETED_POSTS',
    })
    logAnalyticsEvent('course_submissions_viewed', {
      courseSlug: course.slug,
    })
  }, [course.slug])

  const newSubmission = async () => {
    console.log('TBD')
    if (!auth.currentUser) {
      const user = await logIn()
      console.log({ user })
    }
    console.log('Submission form')
  }

  return (
    <>
      <PageSEO
        title={`${course.name} - Project Submissions`}
        description={course.description || siteMetadata.description}
      />
      <div className="flex gap-12 flex-col-reverse md:grid md:grid-cols-3 md:gap-4">
        <article className="chapters col-span-1">
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
        </article>
        <main className="flex-1 md:min-h-[300px] col-span-2">
          <header className="flex items-center justify-end">
            <Button onClick={newSubmission}>Submit</Button>
          </header>
          <div>Submissions will be here</div>
        </main>
        {/* <Dialog></Dialog> */}
      </div>
    </>
  )
}

CourseSubmissionsPage.showAds = true
