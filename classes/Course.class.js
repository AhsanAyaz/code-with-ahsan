import Post from './Post.class'

class Course {
  constructor(course) {
    this.id = course.id
    const courseAttributes = course.attributes
    this.name = courseAttributes.name
    this.description = courseAttributes.description
    this.outline = courseAttributes.outline
    this.videoUrls = courseAttributes.videoUrls
    this.publishedAt = courseAttributes.publishedAt
    this.duration = courseAttributes.duration
    this.slug = courseAttributes.slug
    if (courseAttributes.chapters) {
      this.chapters = courseAttributes.chapters.data.map((chapter) => {
        const { attributes } = chapter
        const { title, description, posts } = attributes
        let mappedPosts = posts.data.map((post) => new Post(post))
        if (mappedPosts.length > 0 && mappedPosts[0].order) {
          // sort by order
          mappedPosts.sort((a, b) => +a.order - +b.order)
        }
        return {
          title,
          description,
          posts: mappedPosts,
        }
      })
    } else {
      this.chapters = []
    }

    this.authors = courseAttributes.authors.data.map((author) => {
      const { attributes } = author
      const { bio, name, socials, avatar } = attributes
      return {
        bio,
        name,
        socials,
        avatar: avatar?.data?.attributes?.url,
      }
    })
  }
}

export default Course
