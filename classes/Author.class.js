class Author {
  constructor(author) {
    const { attributes } = author
    const { bio, name, socials, avatar } = attributes
    this.bio = bio
    this.avatar = avatar?.data?.attributes?.url
    this.socials = socials
    this.name = name
  }
}

export default Author
