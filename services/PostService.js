const { AppStorage } = require('./Storage')

class PostProgressService extends AppStorage {
  constructor() {
    super('postsProgress')
  }

  getCompletedPosts() {
    return this.getItem() || {}
  }

  markPostAsCompleted(slug) {
    const posts = this.getItem() || {}
    posts[slug] = true
    this.setItem(posts)
  }

  markPostAsIncomplete(slug) {
    const posts = this.getItem() || {}
    delete posts[slug]
    this.setItem(posts)
  }
}

const service = new PostProgressService()

export const postsReducer = (state, action) => {
  switch (action.type) {
    case 'RETRIEVE_COMPLETED_POSTS':
      return {
        ...state,
        completedPosts: service.getCompletedPosts(),
      }
    case 'MARK_AS_COMPLETE':
      service.markPostAsCompleted(action.payload.slug)
      return {
        ...state,
        completedPosts: {
          ...state.completedPosts,
          [action.payload.slug]: true,
        },
      }
    case 'MARK_AS_INCOMPLETE':
      service.markPostAsIncomplete(action.payload.slug)
      return {
        ...state,
        completedPosts: {
          ...state.completedPosts,
          [action.payload.slug]: false,
        },
      }
    default:
      return state
  }
}
