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
      assignment,
    } = attributes
    const chapterId = chapter?.data?.id
    this.title = title
    this.description = description
    this.videoUrl = videoUrl
    this.order = order
    this.slug = slug
    this.resources = resources
    this.chapterId = chapterId
    this.videoEmbedded = videoEmbedded ? JSON.parse(videoEmbedded) : null
    this.embedUrl = this.getEmbedUrl()
    this.assignment = assignment
  }

  getEmbedUrl() {
    const originalUrl = this.videoUrl || this.videoEmbedded?.url
    if (!originalUrl) {
      return
    }
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
      console.log(e, this)
    }
  }
}

export default Post
