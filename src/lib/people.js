import fs from 'fs'
import path from 'path'
import { getFiles } from './mdx'

const root = process.cwd()

export default async function getAllPeople() {
  const type = 'people'
  let files = []

  try {
    files = await getFiles('people')
  } catch (e) {
    console.log(e)
  }

  const people = []
  // Iterate through each post, putting all found tags into `tags`
  files.forEach((file) => {
    const source = fs.readFileSync(path.join(root, 'src', 'data', type, file), 'utf8')
    people.push(JSON.parse(source))
  })

  return people
}
