import Post from './Post.class'

// Helper function to extract timestamp from YouTube URL
const getYouTubeTimestamp = (url) => {
  try {
    // Extract the 't' parameter from URL
    const timeMatch = url?.match(/[&?]t=(\d+)/)
    return timeMatch ? parseInt(timeMatch[1], 10) : undefined
  } catch {
    return undefined
  }
}
class Chapter {
  constructor(chapter) {
    const { name, description, posts, showName } = chapter
    let mappedPosts = posts?.length ? posts.map((post) => new Post(post)) : []
    if (mappedPosts.length > 0) {
      const hasTimeStamp = mappedPosts.every((post) => {
        const ts = getYouTubeTimestamp(post.videoUrl)
        const timestamp = Number.isInteger(ts)
        return timestamp
      })
      if (hasTimeStamp) {
        // Sort posts by video timestamp
        mappedPosts.sort((a, b) => {
          const timeA = getYouTubeTimestamp(a.videoUrl)
          const timeB = getYouTubeTimestamp(b.videoUrl)
          return timeA - timeB
        })
      } else {
        // sort by order
        mappedPosts.sort((a, b) => +a.order - +b.order)
      }
      // sort by order
    }
    this.id = chapter.id
    this.name = name
    this.description = description
    this.posts = mappedPosts
    this.showName = showName
  }
}

export default Chapter
