import Author from './Author.class'
import Chapter from './Chapter.class'

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
      this.chapters = courseAttributes.chapters.data.map((chapter) => new Chapter(chapter))
    } else {
      this.chapters = []
    }

    this.authors = courseAttributes.authors.data.map((author) => new Author(author))
  }
}

export default Course
