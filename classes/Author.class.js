class Author {
  constructor(author) {
    const { bio, name, meta, avatar } = author
    this.bio = bio
    this.avatar = avatar?.url
    this.socials = meta?.socials
    this.name = name
  }
}

export default Author
