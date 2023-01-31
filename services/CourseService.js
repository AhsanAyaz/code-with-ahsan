import axios from 'axios'
import qs from 'qs'
import Course from '../classes/Course.class'
import STRAPI_CONFIG from '../lib/strapiConfig'

const strapiUrl = process.env.STRAPI_URL
const strapiAPIKey = process.env.STRAPI_API_KEY

export const getCoursesForStaticPaths = async () => {
  const query = qs.stringify(
    {
      populate: ['authors', 'authors.avatar', 'chapters', 'chapters.posts'],
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
  const paths = []
  courses.map((course) => {
    paths.push({
      params: {
        course: course.slug,
      },
    })
  })
  const config = {
    paths,
    fallback: false,
  }
  return config
}
