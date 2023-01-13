import Post from './Post.class'

class Chapter {
  constructor(chapter) {
    const { attributes } = chapter
    const { name, description, posts, showName } = attributes
    let mappedPosts = posts.data.map((post) => new Post(post))
    if (mappedPosts.length > 0 && mappedPosts[0].order) {
      // sort by order
      mappedPosts.sort((a, b) => +a.order - +b.order)
    }
    this.id = chapter.id
    this.name = name
    this.description = description
    this.posts = mappedPosts
    this.showName = showName
  }
}

export default Chapter
