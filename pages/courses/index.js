import siteMetadata from '@/data/siteMetadata'
import { PageSEO } from '@/components/SEO'
import axios from 'axios'
import CourseCard from '../../components/courses/CourseCard'
import qs from 'qs'
import Course from '../../classes/Course.class'
import STRAPI_CONFIG from '../../lib/strapiConfig'

export async function getStaticProps() {
  const strapiUrl = process.env.STRAPI_URL
  const strapiAPIKey = process.env.STRAPI_API_KEY
  const query = qs.stringify(
    {
      populate: ['authors', 'authors.avatar', 'banner', 'banner.image'],
      sort: ['publishedAt:desc'],
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
  return { props: { coursesStr: JSON.stringify(courses) } }
}

export default function Courses({ coursesStr }) {
  const courses = JSON.parse(coursesStr)
  return (
    <>
      <PageSEO title={`Courses - ${siteMetadata.author}`} description={siteMetadata.description} />
      <div className="max-w-lg mx-auto grid grid-cols-1 gap-8">
        {courses &&
          courses.map((course) => {
            return <CourseCard course={course} key={course.id} />
          })}
      </div>
    </>
  )
}

Courses.showAds = true
