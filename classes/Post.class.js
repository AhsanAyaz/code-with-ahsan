class Post {
  constructor(post) {
    this.id = post.id
    const attributes = post.attributes
    const { title, description, videoUrl, order, slug, chapter } = attributes
    const chapterId = chapter?.data?.id
    this.title = title
    this.description = description
    this.videoUrl = videoUrl
    this.order = order
    this.slug = slug
    this.chapterId = chapterId
    this.embedUrl = this.getEmbedUrl()
  }

  getEmbedUrl() {
    let vidUrl
    try {
      if (this.videoUrl.includes('youtube')) {
        vidUrl = this.videoUrl.split('watch?v=')[1]
        if (vidUrl.includes('&')) {
          vidUrl = vidUrl.split('&')[0]
        }
        return `https://www.youtube.com/embed/${vidUrl}`
      } else if (this.videoUrl.includes('vimeo')) {
        vidUrl = this.videoUrl.split('vimeo.com/')[1]
      } else if (this.videoUrl.includes('youtu.be')) {
        vidUrl = this.videoUrl.split('youtu.be/')[1]
        if (vidUrl.includes('&')) {
          vidUrl = vidUrl.split('&')[0]
        }
        return `https://www.youtube.com/embed/${vidUrl}`
      } else if (this.videoUrl.includes('dailymotion')) {
        vidUrl = this.videoUrl.split('video/')[1]
      } else if (this.videoUrl.includes('facebook')) {
        vidUrl = this.videoUrl.split('facebook.com/')[1]
      } else {
        vidUrl = this.videoUrl
      }
      return this.videoUrl
    } catch (e) {
      console.log(e)
    }
  }
}

export default Post
