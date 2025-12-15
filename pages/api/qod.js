import OpenAI from 'openai'

const { OPEN_AI_SECRET, CODE_WITH_AHSAN_PAGE_ID, QOD_EP_API_KEY, FB_PAGE_ACCESS_TOKEN } =
  process.env
const openai = new OpenAI({
  apiKey: OPEN_AI_SECRET,
})
import axios from 'axios'

const IS_QOD_ENABLED = process.env.IS_QOD_ENABLED

const sendMessageToDiscord = async (content) => {
  const webhookURL = process.env.DISCORD_WEBHOOK
  try {
    const res = await axios.post(webhookURL, {
      content: `@everyone ${content}`,
      username: 'CodeWithAhsan',
    })
    return res
  } catch (e) {
    console.error('error posting message to discord: ', e)
    return null
  }
}

const createPostForFacebook = async (content, accessToken) => {
  try {
    const resp = await axios.post(
      `https://graph.facebook.com/${CODE_WITH_AHSAN_PAGE_ID}/feed?message=${encodeURIComponent(
        content
      )}&access_token=${accessToken}`
    )
    return resp
  } catch (e) {
    console.log('Failed to post to facebook: ', e.response)
    return null
  }
}

const getContentFromChatGPT = async () => {
  const messages = [
    {
      role: 'user',
      content: `Generate a daily tech engagement question for a Facebook audience, similar in style to:

      'Hey everyone, happy [day]. What has been your biggest challenge since yesterday?'
      'Hey everyone. Do you have an opensource project you've been working on? Share the link in the comments.'
      'Hey everyone. What is the programming language/tool you're focusing on these days?'
      'Hey everyone. Do you prefer X frontend framework over Y? And what's the reason?'
      'Hey everyone. How do you keep yourself productive throughout the day as a software engineer?'
      Make sure the question is open-ended, relevant to tech enthusiasts, and encourages interaction.`,
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
  if (!IS_QOD_ENABLED) {
    return
  }
  const content = await getContentFromChatGPT()
  if (!FB_PAGE_ACCESS_TOKEN) {
    return
  }
  const resFacebook = await createPostForFacebook(content, FB_PAGE_ACCESS_TOKEN)
  if (resFacebook === null) {
    return
  }
  console.log('Posted to facebook successfully')
  await sendMessageToDiscord(content)
  console.log('Posted to discord successfully')
}

export default async function handler(req, res) {
  const { method } = req
  if (req.query.key !== QOD_EP_API_KEY) {
    console.log('invalid api key', req.query.key)
    res.status(404).end()
    return
  }

  switch (method) {
    case 'GET':
      try {
        await sendQuestionOfTheDay()
        res.status(200).json({ success: true })
      } catch (error) {
        console.log({
          errorSendingQod: error,
        })
        res.status(400).json({ success: false, error })
      }
      break
    default:
      res.status(404).json({ success: false })
      break
  }
}
