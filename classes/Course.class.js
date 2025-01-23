import { getEmbedUrl } from '../services/YouTubeService'
import Author from './Author.class'
import Chapter from './Chapter.class'

class Course {
  constructor(course) {
    this.id = course.id
    this.name = course.name
    this.description = course.description
    this.outline = course.outline
    this.videoUrls = course.videoUrls
    this.publishedAt = course.publishedAt
    this.duration = course.duration
    this.resources = course.resources
    this.banner = course.banner?.url
    this.introVideoUrl = course.introVideoUrl
    this.slug = course.slug
    this.isExternal = course.isExternal
    this.externalCourseUrl = course.externalCourseUrl
    this.externalStudentsCount = course.externalStudentsCount
    if (course.chapters) {
      this.chapters = course.chapters.map((chapter) => new Chapter(chapter))
    } else {
      this.chapters = []
    }

    this.authors = course.authors.map((author) => new Author(author))
    this.introEmbeddedUrl = getEmbedUrl(this.introVideoUrl)?.url || ''
  }
}

export default Course
