import { getYouTubeComments } from '../../../services/YouTubeService'
export default async function handler(req, res) {
  const { method } = req
  switch (method) {
    case 'GET':
      try {
        const comments = await getYouTubeComments(req.query.videoId)
        res.status(200).json({ success: true, comments })
      } catch (error) {
        res.status(400).json({ success: false, error })
      }
      break
    default:
      res.status(404).json({ success: false })
      break
  }
}
