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
    let vidUrl = this.videoUrl
    let videoParams = ''
    try {
      if (this.videoUrl.includes('youtube') || this.videoUrl.includes('youtu.be')) {
        vidUrl = `https://www.youtube.com/embed/`
        videoParams = this.videoUrl.includes('youtube')
          ? this.videoUrl.split('watch?v=')[1]
          : this.videoUrl.split('youtu.be/')[1]
        if (videoParams.includes('&')) {
          const [videoId, ...segments] = videoParams.split('&')
          videoParams = videoId
          segments.forEach((segment) => {
            const [key, val] = segment.split('=')
            if (key === 't') {
              const time = val.replace('s', '')
              videoParams += `?start=${Number(time) || 1}`
            }
          })
        }
        vidUrl += `${videoParams}${videoParams.includes('?') ? `&` : '?'}autoplay=1`
      }
      return vidUrl
    } catch (e) {
      console.log(e)
    }
  }
}

export default Post
