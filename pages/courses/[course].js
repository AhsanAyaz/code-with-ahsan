import siteMetadata from '@/data/siteMetadata'
import { PageSEO } from '@/components/SEO'
import axios from 'axios'
import qs from 'qs'
import Course from '../../classes/Course.class'
import PostsList from '../../components/courses/PostsList'
import { useReducer, useEffect } from 'react'
import { postsReducer } from '../../services/PostService'

const strapiUrl = process.env.STRAPI_URL
const strapiAPIKey = process.env.STRAPI_API_KEY

export async function getStaticPaths() {
  const query = qs.stringify(
    {
      populate: ['authors', 'authors.avatar'],
      _sort: 'chapters.posts:ASC',
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
      populate: ['authors', 'authors.avatar', 'chapters', 'chapters.posts'],
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
  }, [course.slug])
  return (
    <>
      <PageSEO title={`Courses - ${course.name}`} description={siteMetadata.description} />
      <div className="">
        <article className="chapters text-center">
          {course &&
            course.chapters.map((chapter, index) => {
              return (
                <section key={index} className="mb-2">
                  <h3>{chapter.name}</h3>
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
    </>
  )
}
