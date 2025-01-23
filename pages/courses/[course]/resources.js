import axios from 'axios'
import qs from 'qs'
import Course from '../../../classes/Course.class'
import { STRAPI_COURSE_POPULATE_OBJ } from '../../../lib/strapiQueryHelpers'
import ResourcesLinks from '../../../components/ResourcesLinks'
import { getCoursesForStaticPaths } from '../../../services/CourseService'
import CoursePostLayout from '../../../layouts/CoursePostLayout'
const strapiUrl = process.env.STRAPI_URL
const strapiAPIKey = process.env.STRAPI_API_KEY

export async function getStaticPaths() {
  return getCoursesForStaticPaths()
}

export async function getStaticProps({ params }) {
  const { course: courseId } = params

  const query = qs.stringify(
    {
      populate: STRAPI_COURSE_POPULATE_OBJ,
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

function CourseResourcesPage({ course }) {
  const { resources } = course
  return (
    <>
      <header className="mb-6">
        <h1 className="text-4xl text-center">Resources</h1>
      </header>
      <ResourcesLinks noHeading={true} resources={resources} />
    </>
  )
}

CourseResourcesPage.showAds = true

export default function PostPageWithLayout({ courseStr }) {
  const course = JSON.parse(courseStr)
  return (
    <CoursePostLayout
      ChildComponent={CourseResourcesPage}
      courseStr={courseStr}
      seo={{
        title: `${course.name} - Resources`,
        description: `Resources for ${course.title}`,
      }}
    ></CoursePostLayout>
  )
}
