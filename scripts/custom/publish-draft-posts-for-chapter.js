require('dotenv').config()
const qs = require('qs')
const axios = require('axios')

// Headers config
axios.defaults.headers.common['Authorization'] = `Bearer ${process.env.STRAPI_API_KEY}`

const CHAPTER_ID = 6

const publishPosts = async (chapterId) => {
  const postQuery = qs.stringify(
    {
      publicationState: 'preview',
      filters: { chapter: chapterId },
    },
    {
      encodeValuesOnly: true,
    }
  )
  const postResp = await axios.get(`${process.env.STRAPI_URL}/api/posts?${postQuery}`, {
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
  })
  const draftPosts = postResp.data.data
    .map((value) => {
      return {
        id: value.id,
        ...value.attributes,
      }
    })
    .filter((post) => post.publishedAt === null)
  const promises = draftPosts.map((post) => {
    console.log(`publishing post: ${post.title}`)
    return axios.put(`${process.env.STRAPI_URL}/api/posts/${post.id}`, {
      data: {
        publishedAt: post.updatedAt,
      },
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
    })
  })
  try {
    await Promise.all(promises)
    console.log('Posts published')
  } catch (e) {
    console.log(JSON.stringify(e))
  }
}

;(async () => {
  await publishPosts(CHAPTER_ID)
  console.log('done')
})()
