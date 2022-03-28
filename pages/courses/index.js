import siteMetadata from '@/data/siteMetadata'
import { PageSEO } from '@/components/SEO'
import axios from 'axios'
import CourseCard from '../../components/courses/CourseCard'
import qs from 'qs'
import Course from '../../classes/Course.class'

export async function getStaticProps() {
  const strapiUrl = process.env.STRAPI_URL
  const strapiAPIKey = process.env.STRAPI_API_KEY
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
  return { props: { coursesStr: JSON.stringify(courses) } }
}

export default function Courses({ coursesStr }) {
  const courses = JSON.parse(coursesStr)
  return (
    <>
      <PageSEO title={`Courses - ${siteMetadata.author}`} description={siteMetadata.description} />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {courses &&
          courses.map((course) => {
            return <CourseCard course={course} key={course.id} />
          })}
      </div>
    </>
  )
}
