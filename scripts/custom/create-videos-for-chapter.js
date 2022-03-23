require('dotenv').config()
const axios = require('axios')
const puppeteer = require('puppeteer')
// Headers config
axios.defaults.headers.common['Authorization'] = `Bearer ${process.env.STRAPI_API_ADMIN_KEY}`

// Constants
const PLAYLIST_URL =
  'https://www.youtube.com/watch?v=e8CKjkwpadA&list=PL2sQdFoGnLIjERHiLVzcheUODYLPMiUx3'
const CHAPTER_ID = '1'

const createPosts = (videos, chapterId) => {
  videos.reduce((acc, video, index) => {
    const { url, title } = video
    return acc.then(() => {
      return axios
        .post(`${process.env.STRAPI_URL}/api/posts`, {
          data: {
            title,
            type: 'video',
            videoUrl: url,
            video: null,
            resources: [],
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
