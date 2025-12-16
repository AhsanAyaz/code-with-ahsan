const STRAPI_COURSE_POPULATE_OBJ = {
  authors: {
    fields: ['name', 'bio'],
    populate: {
      avatar: true,
    },
  },
  chapters: {
    fields: ['name', 'description', 'showName'],
    populate: {
      posts: {
        fields: ['title', 'slug', 'description', 'type', 'videoUrl', 'order'],
      },
    },
  },
  banner: true, // or whatever your image field is named
  resources: {
    fields: ['*'], // Adjust based on your resources structure
  },
}

const STRAPI_POST_QUERY_OBJ = {
  fields: ['title', 'slug', 'description', 'type', 'videoUrl', 'article', 'hasAssignment'],
  populate: {
    chapter: {
      fields: ['name'],
    },
    resources: {
      fields: ['*'],
    },
  },
}

module.exports = {
  STRAPI_COURSE_POPULATE_OBJ,
  STRAPI_POST_QUERY_OBJ,
}
