import { getEmbedUrl } from '../services/YouTubeService'

class Post {
  constructor(post) {
    this.id = post.id
    const attributes = post.attributes
    const {
      title,
      resources,
      description,
      videoUrl,
      order,
      slug,
      chapter,
      videoEmbedded,
      hasAssignment,
      type,
      article,
      thumbnail,
    } = attributes
    const chapterId = chapter?.data?.id
    this.title = title
    this.type = type
    this.description = description
    this.videoUrl = videoUrl
    this.order = order
    this.slug = slug
    this.article = article
    this.resources = resources
    this.thumbnail = thumbnail
    this.chapterId = chapterId
    this.videoEmbedded = videoEmbedded ? JSON.parse(videoEmbedded) : null
    this.embed = getEmbedUrl(this.videoUrl || this.videoEmbedded?.url)
    this.hasAssignment = hasAssignment
  }
}

export default Post
