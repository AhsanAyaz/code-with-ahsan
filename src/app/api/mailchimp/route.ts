import { NextResponse } from 'next/server'
// @ts-ignore
import mailchimp from '@mailchimp/mailchimp_marketing'
// @ts-ignore
import md5 from 'md5'

mailchimp.setConfig({
  apiKey: process.env.MAILCHIMP_API_KEY,
  server: process.env.MAILCHIMP_API_SERVER,
})

export async function POST(req: Request) {
  const { email } = await req.json()
  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  try {
    const listId = process.env.MAILCHIMP_AUDIENCE_ID
    // @ts-ignore
    await mailchimp.lists.addListMember(listId, {
      email_address: email,
      status: 'subscribed',
    })
    const subscriberHash = md5(email.toLowerCase())
    // @ts-ignore
    await mailchimp.lists.updateListMemberTags(listId, subscriberHash, {
      tags: [
        {
          name: 'codewithahsan.dev',
          status: 'active',
        },
      ],
    })
    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error: any) {
    // Fallback or specific error handling
    return NextResponse.json({ error: error }, { status: error.status || 500 })
  }
}
