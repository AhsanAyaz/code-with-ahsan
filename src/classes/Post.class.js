import { getEmbedUrl } from '../lib/utils/youtube'

class Post {
  constructor(post) {
    this.id = post.id
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
      publishedAt,
    } = post
    const chapterId = chapter?.id
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
    this.publishedAt = publishedAt
  }
}

export default Post
