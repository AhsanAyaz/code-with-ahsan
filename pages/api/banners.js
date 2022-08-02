const strapiUrl = process.env.STRAPI_URL
const strapiAPIKey = process.env.STRAPI_API_KEY

import axios from 'axios'

export default async function handler(req, res) {
  const { method } = req
  switch (method) {
    case 'GET':
      try {
        const url = `${strapiUrl}/api/banners`
        const bannersResp = await axios.get(url, {
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            Authorization: `Bearer ${strapiAPIKey}`,
          },
        })
        const banners = bannersResp?.data?.data || []
        res.status(200).json({ success: !!banners.length, banners })
      } catch (error) {
        res.status(400).json({ success: false, banners: [] })
      }
      break
    default:
      res.status(404).json({ success: false })
      break
  }
}
