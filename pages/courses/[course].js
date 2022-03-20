import siteMetadata from '@/data/siteMetadata'
import { PageSEO } from '@/components/SEO'
import axios from 'axios'
import qs from 'qs'
import Course from '../../classes/Course.class'

const strapiUrl = process.env.STRAPI_URL
const strapiAPIKey = process.env.STRAPI_API_KEY

export async function getStaticPaths() {
  const query = qs.stringify(
    {
      populate: ['authors', 'authors.avatar'],
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
        course: course.id.toString(),
      },
    })),
    fallback: false,
  }
  console.log('🚀 ~ file: [course].js ~ line 37 ~ getStaticPaths ~ config', JSON.stringify(config))
  return config
}

export async function getStaticProps({ params }) {
  const courseId = params.course

  const query = qs.stringify(
    {
      populate: ['authors', 'authors.avatar'],
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
  console.log('🚀 ~ file: courses.js ~ line 30 ~ courses.map ~ course', course)
  return (
    <>
      <PageSEO title={`Courses - ${course.name}`} description={siteMetadata.description} />
      <div>
        {course &&
          course.videoUrls &&
          course.videoUrls.map((videoUrl, index) => {
            let vidUrl = videoUrl.split('=')[1]
            vidUrl = vidUrl.split('&')[0]
            return (
              <iframe
                className="mb-4"
                key={index}
                width="560"
                height="315"
                src={`https://www.youtube.com/embed/${vidUrl}`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            )
          })}
      </div>
    </>
  )
}
