require('dotenv').config()
const axios = require('axios')
const puppeteer = require('puppeteer')
const crypto = require('crypto')

// Headers config
axios.defaults.headers.common['Authorization'] = `Bearer ${process.env.STRAPI_API_KEY}`

// Constants
const VIDEO_URL = `https://www.youtube.com/watch?v=oUmVFHlwZsI` // Replace with the actual video URL
const CHAPTER_ID = '14'

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

// Function to extract timestamps and titles from the description
const parseTimeline = (description) => {
  const timestamps = []
  const lines = description.split('\n')
  lines.forEach((line) => {
    const timeMatch = line.match(/((?:\d{1,2}:)?\d{1,2}:\d{2})/)
    if (timeMatch) {
      const title = line.replace(timeMatch[0], '').trim().replace(/^-+/, '').trim()
      timestamps.push({
        timestamp: timeMatch[1],
        title: title,
      })
    }
  })
  return timestamps
}

// Function to convert HH:MM:SS to seconds
const timestampToSeconds = (timestamp) => {
  const [hours, minutes, seconds] = timestamp.split(':').map(Number)
  return hours * 3600 + minutes * 60 + seconds
}

// Function to create video posts (updated)
const createPosts = (timestamps, chapterId) => {
  return timestamps.reduce((acc, { timestamp, title }) => {
    const seconds = timestampToSeconds(timestamp)
    return acc.then(async () => {
      const uniqueSlug = await generateUniqueSlug()
      return axios
        .post(`${process.env.STRAPI_URL}/api/posts`, {
          data: {
            title,
            type: 'video',
            videoUrl: `${VIDEO_URL}&t=${seconds}`,
            video: null,
            resources: [],
            slug: uniqueSlug,
            chapter: chapterId,
          },
        })
        .then((resp) => {
          console.log('post created, ', resp.data.data)
        })
        .catch((err) => {
          console.log(JSON.stringify(err))
        })
    })
  }, Promise.resolve())
}

// Function to scrape the video description
const scrapeDescription = async (url) => {
  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 1000,
  })
  const page = await browser.newPage()
  await page.goto(url)

  await page.waitForSelector('[video-id="oUmVFHlwZsI"] yt-attributed-string[user-input]')

  const description = await page.evaluate(() => {
    const description = document.querySelector(
      '[video-id="oUmVFHlwZsI"] yt-attributed-string[user-input]'
    )
    return description.innerText
  })
  await browser.close()
  return description
}

const main = async () => {
  try {
    const description = await scrapeDescription(VIDEO_URL)
    const timestamps = parseTimeline(description)
    console.log(JSON.stringify(timestamps))
    await createPosts(timestamps, CHAPTER_ID)
  } catch (err) {
    console.error('Error during scraping:', err)
  }
}

main()
