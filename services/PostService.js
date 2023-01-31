export const getNextAndPreviousPosts = (course, post) => {
  const chapter = course.chapters.find((chapter) => {
    return chapter.id === post.chapterId
  })
  const postIndex = chapter.posts.findIndex((p) => p.slug === post.slug)
  if (postIndex < 0) {
    return {
      nextPost: null,
      previousPost: null,
    }
  }
  const postsLength = chapter.posts.length
  return {
    nextPost: postIndex === postsLength - 1 ? null : chapter.posts[postIndex + 1].slug,
    previousPost: postIndex === 0 ? null : chapter.posts[postIndex - 1].slug,
  }
}
