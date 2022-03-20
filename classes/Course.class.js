const strapiUrl = process.env.STRAPI_URL
class Course {
  constructor(course) {
    this.id = course.id
    const courseAttributes = course.attributes
    this.name = courseAttributes.name
    this.description = courseAttributes.description
    this.outline = courseAttributes.outline
    this.videoUrls = courseAttributes.videoUrls.urls
    this.publishedAt = courseAttributes.publishedAt
    this.duration = courseAttributes.duration
    this.authors = courseAttributes.authors.data.map((author) => {
      const { attributes } = author
      const { bio, name, socials, avatar } = attributes
      return {
        bio,
        name,
        socials,
        avatar: `${strapiUrl}${avatar.data.attributes.url}`,
      }
    })
  }
}

export default Course

/*
(course) => {
    return {
      attributes: {
        ...course.attributes,
        authors: {
          data: course.attributes.authors.data.map((author) => {
            return {
              ...author,
              attributes: {
                ...author.attributes,
                avatar: {
                  data: {
                    ...author.attributes.avatar.data,
                    attributes: {
                      ...author.attributes.avatar.data.attributes,
                      url: `${strapiUrl}${author.attributes.avatar.data.attributes.url}`,
                    },
                  },
                },
              },
            }
          }),
        },
      },
    }
  }

*/
