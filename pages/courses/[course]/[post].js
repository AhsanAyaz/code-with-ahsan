import siteMetadata from '@/data/siteMetadata'
import { PageSEO } from '@/components/SEO'
import axios from 'axios'
import qs from 'qs'
import Course from '../../../classes/Course.class'
import Link from 'next/link'
import Post from '../../../classes/Post.class'
import PostsList from '../../../components/courses/PostsList'

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
            post: post.slug,
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
      <div className="flex flex-col-reverse md:grid md:grid-cols-3 gap-4">
        <article className="chapters col-span-1">
          {course &&
            course.chapters.map((chapter, index) => {
              return (
                <section key={index} className="mb-2">
                  <h3>{chapter.name}</h3>
                  <PostsList chapter={chapter} courseSlug={course.slug} post={post} />
                </section>
              )
            })}
        </article>
        <main className="flex-1 md:min-h-[300px] col-span-2">
          <div className="embed-container mb-4">
            <iframe src={post.embedUrl} title={post.title} frameBorder="0" allowFullScreen></iframe>
          </div>
        </main>
      </div>
    </>
  )
}
