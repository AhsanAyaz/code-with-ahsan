import OpenAI from 'openai'

const {
  OPEN_AI_SECRET,
  FB_PAGE_ACCESS_TOKEN,
  CODE_WITH_AHSAN_PAGE_ID,
  QOD_EP_API_KEY,
} = process.env
const openai = new OpenAI({
  apiKey: OPEN_AI_SECRET,
})
import axios from 'axios'

const sendMessageToDiscord = async (content) => {
  const webhookURL = process.env.DISCORD_WEBHOOK
  try {
    const res = await axios.post(webhookURL, {
      content: `@everyone ${content}`,
      username: 'CodeWithAhsan',
    })
    console.log('posted to discord successfully')
    return res
  } catch (e) {
    console.error('error posting message to discord: ', e)
  }
}

const createPostForFacebook = async (content) => {
  console.log({ content })
  return await axios.post(
    `https://graph.facebook.com/${CODE_WITH_AHSAN_PAGE_ID}/feed?message=${encodeURIComponent(
      content
    )}&access_token=${FB_PAGE_ACCESS_TOKEN}`
  )
}

const getContentFromChatGPT = async () => {
  const messages = [
    {
      role: 'user',
      content: `As a tech-content creator, and a software architect and fullstack developer,
        write a short facebook post that the followers can engage with. Ask a question or something that everyone can respond to.
        Keep it short. 350 characters max. Keep it sober and not too overwhelming with emojis. Start with "Hey everyone 👋🏽, it's time for the question of the day 🚀...\n" Use good hashtags for SEO.
        Do not mention what you built or didn't. Just ask about the audience's activity, likings, things they find difficult etc. Make it engaging.
        Include the following hashtags at the end (you can add your own too). #codewithahsan #community #questionOfTheDay.
        `,
    },
  ]
  const chatCompletion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: messages,
  })

  const { content } = chatCompletion.choices[0].message
  return content
}

const sendQuestionOfTheDay = async () => {
  const content = await getContentFromChatGPT()
  const resFacebook = await createPostForFacebook(content)
  const resDiscord = await sendMessageToDiscord(content)

  const responses = {
    resFacebook,
    resDiscord,
  }
  console.log(responses)
  return responses
}

export default async function handler(req, res) {
  const { method } = req
  if (req.query.key !== QOD_EP_API_KEY) {
    res.status(404).end()
    return
  }
  console.log(req)

  switch (method) {
    case 'GET':
      try {
        const resp = await sendQuestionOfTheDay()
        res.status(200).json({ resp })
      } catch (error) {
        res.status(400).json({ success: false, error })
      }
      break
    default:
      res.status(404).json({ success: false })
      break
  }
}
