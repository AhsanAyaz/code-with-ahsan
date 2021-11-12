import mailchimp from '@mailchimp/mailchimp_marketing'
const md5 = require('md5')

mailchimp.setConfig({
  apiKey: process.env.MAILCHIMP_API_KEY,
  server: process.env.MAILCHIMP_API_SERVER, // E.g. us1
})

// eslint-disable-next-line import/no-anonymous-default-export
export default async (req, res) => {
  const { email } = req.body

  if (!email) {
    return res.status(400).json({ error: 'Email is required' })
  }

  try {
    const listId = process.env.MAILCHIMP_AUDIENCE_ID
    await mailchimp.lists.addListMember(listId, {
      email_address: email,
      status: 'subscribed',
    })
    const subscriberHash = md5(email.toLowerCase())
    await mailchimp.lists.updateListMemberTags(listId, subscriberHash, {
      tags: [
        {
          name: 'codewithahsan.org',
          status: 'active',
        },
      ],
    })
    return res.status(201).json({ error: '' })
  } catch (error) {
    return res.status(error.status).json({ error: error })
  }
}
