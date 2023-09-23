import OpenAI from 'openai'

const {
  OPEN_AI_SECRET,
  CODE_WITH_AHSAN_PAGE_ID,
  QOD_EP_API_KEY,
  FB_PAGE_ACCESS_TOKEN,
} = process.env
const openai = new OpenAI({
  apiKey: OPEN_AI_SECRET,
})
import axios from 'axios'

// const getFBAccessToken = async () => {
//   const resp = await axios.get(
//     `https://graph.facebook.com/${FB_USER_ID}/accounts?access_token=${FB_USER_ACCESS_TOKEN}`
//   )
//   const { data } = resp.data
//   const { access_token } = data[0]
//   console.log({
//     resp: access_token,
//   })
//   return access_token
// }

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
      content: `I want you to act like a full-stack software architect and tech content creator.
        Write a short facebook post that the followers can engage with. Ask a question or something that everyone can respond to.
        350 characters max. Ask about the audience's activities, projects, challenges etc. Make it engaging.
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
  if (!FB_PAGE_ACCESS_TOKEN) {
    return
  }
  const resFacebook = await createPostForFacebook(content, FB_PAGE_ACCESS_TOKEN)
  if (resFacebook === null) {
    return
  }
  console.log('Posted to facebook successfully')
  const resDiscord = await sendMessageToDiscord(content)
  console.log('Posted to discord successfully')

  const responses = {
    resFacebook,
    resDiscord,
  }
  console.log({ responses })
  return responses
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
        const resp = await sendQuestionOfTheDay()
        res.status(200).json({ resp })
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
