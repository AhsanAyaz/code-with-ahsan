import siteMetadata from '@/data/siteMetadata'
import { PageSEO } from '@/components/SEO'
import axios from 'axios'
import qs from 'qs'
import Course from '../../classes/Course.class'
import Link from 'next/link'

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
                  <ul className="flex flex-col gap-2">
                    {chapter.posts.map((post, index) => {
                      return (
                        <Link passHref key={index} href={`/courses/${course.slug}/${post.id}`}>
                          <li className="px-4 py-2 dark:bg-gray-700 dark:text-white dark:hover:bg-[#6366f1] cursor-pointer bg-gray-100 rounded-md hover:bg-[#6366f1] hover:text-white ">
                            <a className="break-words">{post.title}</a>
                          </li>
                        </Link>
                      )
                    })}
                  </ul>
                </section>
              )
            })}
        </article>
      </div>
    </>
  )
}
