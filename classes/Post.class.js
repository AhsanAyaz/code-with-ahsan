class Post {
  constructor(post) {
    this.id = post.id
    console.log({ post })
    const attributes = post.attributes
    const { title, description, videoUrl, order, slug, chapter, videoEmbedded } = attributes
    const chapterId = chapter?.data?.id
    this.title = title
    this.description = description
    this.videoUrl = videoUrl
    this.order = order
    this.slug = slug
    this.chapterId = chapterId
    this.videoEmbedded = videoEmbedded ? JSON.parse(videoEmbedded) : null
    this.embedUrl = this.getEmbedUrl()
  }

  getEmbedUrl() {
    const originalUrl = this.videoUrl || this.videoEmbedded.url
    let vidUrl = ''
    let videoParams = ''
    try {
      if (originalUrl.includes('youtube') || originalUrl.includes('youtu.be')) {
        vidUrl = `https://www.youtube.com/embed/`
        videoParams = originalUrl.includes('youtube')
          ? originalUrl.split('watch?v=')[1]
          : originalUrl.split('youtu.be/')[1]
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
