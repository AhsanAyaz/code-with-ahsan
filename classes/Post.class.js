class Post {
  constructor(post) {
    this.id = post.id
    const attributes = post.attributes
    const { title, description, videoUrl, order, slug } = attributes
    this.title = title
    this.description = description
    this.videoUrl = videoUrl
    this.order = order
    this.slug = slug
    this.embedUrl = this.getEmbedUrl()
  }

  getEmbedUrl() {
    let vidUrl = this.videoUrl.split('=')[1]
    vidUrl = vidUrl.split('&')[0]
    return `https://www.youtube.com/embed/${vidUrl}`
  }
}

export default Post
