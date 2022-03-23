import siteMetadata from '@/data/siteMetadata'
import { PageSEO } from '@/components/SEO'
import axios from 'axios'
import qs from 'qs'
import Course from '../../../classes/Course.class'
import Link from 'next/link'
import Post from '../../../classes/Post.class'

const strapiUrl = process.env.STRAPI_URL
const strapiAPIKey = process.env.STRAPI_API_KEY

export async function getStaticPaths() {
  const query = qs.stringify(
    {
      populate: ['authors', 'authors.avatar', 'chapters', 'chapters.posts'],
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
  const paths = []
  courses.map((course) => {
    course.chapters.map((chapter) => {
      chapter.posts.map((post) => {
        paths.push({
          params: {
            course: course.slug,
            post: post.id.toString(),
          },
        })
      })
    })
  })
  const config = {
    paths,
    fallback: false,
  }
  return config
}

export async function getStaticProps({ params }) {
  const { course: courseId, post: postId } = params

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
  const postResp = await axios.get(`${strapiUrl}/api/posts/${postId}`, {
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      Authorization: `Bearer ${strapiAPIKey}`,
    },
  })
  const course = new Course(coursesResp.data.data)
  const post = new Post(postResp.data.data)
  return { props: { courseStr: JSON.stringify(course), postStr: JSON.stringify(post) } }
}

export default function PostPage({ courseStr, postStr }) {
  const course = JSON.parse(courseStr)
  const post = JSON.parse(postStr)
  return (
    <>
      <PageSEO title={`Courses - ${course.name}`} description={siteMetadata.description} />
      <div className="grid grid-cols-3 gap-4">
        <article className="chapters col-span-1">
          {course &&
            course.chapters.map((chapter, index) => {
              return (
                <section key={index} className="mb-2">
                  <h3>{chapter.name}</h3>
                  <ul className="flex flex-col gap-2">
                    {chapter.posts.map((post, index) => {
                      return (
                        <Link passHref key={index} href={`/courses/${course.slug}/${post.id}`}>
                          <li className="px-4 py-2 cursor-pointer bg-gray-100 rounded-md hover:bg-[#6366f1] hover:text-white ">
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
        <main className="flex-1 min-h-[300px] col-span-2">
          <div className="embed-container mb-4">
            <iframe src={post.embedUrl} title={post.title} frameBorder="0" allowFullScreen></iframe>
          </div>
        </main>
      </div>
    </>
  )
}
