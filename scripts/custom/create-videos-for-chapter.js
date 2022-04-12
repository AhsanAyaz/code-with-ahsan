require('dotenv').config()
const axios = require('axios')
const puppeteer = require('puppeteer')
// Headers config
axios.defaults.headers.common['Authorization'] = `Bearer ${process.env.STRAPI_API_ADMIN_KEY}`

const toKebabCase = (str) =>
  str &&
  str
    .match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g)
    .map((x) => x.toLowerCase())
    .join('-')

// Constants
const PLAYLIST_URL =
  'https://www.youtube.com/watch?v=5VUIEryDwI0&list=PL2sQdFoGnLIhobWtEEvClQ5-peYO-RSZj'
const CHAPTER_ID = '3'

const createPosts = (videos, chapterId) => {
  videos.reduce((acc, video) => {
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
            slug: toKebabCase(title),
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
