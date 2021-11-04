const path = require('path')
const jimp = require('jimp')
const fs = require('fs')
const matter = require('gray-matter')

const root = process.cwd()

const pipe = (...fns) => (x) => fns.reduce((v, f) => f(v), x)
const pathJoinPrefix = (prefix) => (extraPath) => path.join(prefix, extraPath)

const walkDir = (fullPath) => {
  return fs.statSync(fullPath).isFile() ? fullPath : getAllFilesRecursively(fullPath)
}

const flattenArray = (input) =>
  input.reduce((acc, item) => [...acc, ...(Array.isArray(item) ? item : [item])], [])

const map = (fn) => (input) => input.map(fn)

const getAllFilesRecursively = (folder) =>
  pipe(fs.readdirSync, map(pipe(pathJoinPrefix(folder), walkDir)), flattenArray)(folder)

async function generateThumbnailFromFrontMatter(post) {
  console.log(post)
  const { images, title, slug } = post
  if (!slug || (images && images.length)) {
    return Promise.resolve()
  }
  const output = path.join(root, './public/static/images/', slug, 'seo.jpg')

  return Promise.all([
    jimp.read(path.join(root, './public/static/images/meta-placeholder.png')),
    jimp.loadFont(jimp.FONT_SANS_128_BLACK),
  ]).then(([image, font]) => {
    image
      .print(
        font,
        300,
        450,
        title
          .replace(
            /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g,
            ''
          )
          .trim(),
        2000
      )
      .write(output)
  })
}

function formatSlug(slug) {
  return slug.replace(/\.(mdx|md)/, '')
}

async function getAllFilesFrontMatter(folder) {
  const prefixPaths = path.join(root, './data', folder)

  const files = getAllFilesRecursively(prefixPaths)

  const allFrontMatter = []

  files.forEach((file) => {
    // Replace is needed to work on Windows
    const fileName = file.slice(prefixPaths.length + 1).replace(/\\/g, '/')
    // Remove Unexpected File
    if (path.extname(fileName) !== '.md' && path.extname(fileName) !== '.mdx') {
      return
    }
    const source = fs.readFileSync(file, 'utf8')
    const { data: frontmatter } = matter(source)
    if (frontmatter.draft !== true) {
      const frontMatterData = {
        ...frontmatter,
        slug: formatSlug(fileName),
        date: frontmatter.date ? new Date(frontmatter.date).toISOString() : null,
      }
      allFrontMatter.push(frontMatterData)
      // if (folder === 'blog' && process.env.NODE_ENV === 'production') {
      //   console.log('test', folder)
      //   generateThumbnailFromFrontMatter(frontMatterData)
      // }
    }
  })

  return allFrontMatter.sort((a, b) => dateSortDesc(a.date, b.date))
}

function dateSortDesc(a, b) {
  if (a > b) return -1
  if (a < b) return 1
  return 0
}

const main = async () => {
  const posts = await getAllFilesFrontMatter('blog')

  posts.forEach(generateThumbnailFromFrontMatter)
}

main()
