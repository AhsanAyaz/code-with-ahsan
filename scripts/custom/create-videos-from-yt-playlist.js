require('dotenv').config()
const axios = require('axios')
const puppeteer = require('puppeteer')
const crypto = require('crypto')

// Headers config
axios.defaults.headers.common['Authorization'] = `Bearer ${process.env.STRAPI_API_KEY}`

// Constants
const PLAYLIST_URL =
  'https://www.youtube.com/watch?v=5VUIEryDwI0&list=PL2sQdFoGnLIhobWtEEvClQ5-peYO-RSZj'
const CHAPTER_ID = '3'

const generateUniqueSlug = async () => {
  const maxAttempts = 10 // Adjust as needed
  for (let i = 0; i < maxAttempts; i++) {
    const slug = crypto.randomBytes(3).toString('hex')
    try {
      const response = await axios.get(
        `${process.env.STRAPI_URL}/api/posts?filters[slug][$eq]=${slug}`
      )
      if (response.data.data.length === 0) {
        return slug
      }
    } catch (error) {
      console.error('Error checking slug uniqueness:', error)
      return slug
    }
  }
  throw new Error('Failed to generate a unique slug after multiple attempts')
}

const createPosts = (videos, chapterId) => {
  return videos.reduce((acc, video) => {
    const { url, title } = video
    return acc.then(async () => {
      const uniqueSlug = await generateUniqueSlug()
      return axios
        .post(`${process.env.STRAPI_URL}/api/posts`, {
          data: {
            title,
            type: 'video',
            videoUrl: url,
            video: null,
            resources: [],
            slug: uniqueSlug,
            chapter: chapterId,
          },
        })
        .then((resp) => {
          console.log('post created, ', resp.data.data.attributes)
        })
        .catch((err) => {
          console.log(JSON.stringify(err))
        })
    })
  }, Promise.resolve())
}

const scrape = async (url) => {
  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 1000,
  })
  const page = await browser.newPage()
  await page.goto(url)
  page.on('console', (msg) => console.log('PAGE LOG:', msg.text()))
  const videos = await page.evaluate(() => {
    const playlistItems = document.querySelectorAll(
      'ytd-playlist-panel-video-renderer #wc-endpoint'
    )
    const videos = Array.from(playlistItems).map((item) => {
      return {
        url: `https://youtube.com${item.getAttribute('href')}`,
        title: item.querySelector('#video-title').innerText,
        thumbnail: item.querySelector('ytd-thumbnail #img').getAttribute('src'),
      }
    })
    return Promise.resolve(videos)
  })
  await browser.close()
  console.log(JSON.stringify(videos))
  return videos
}

;(async () => {
  const videos = await scrape(PLAYLIST_URL)
  createPosts(videos, CHAPTER_ID)
})()
