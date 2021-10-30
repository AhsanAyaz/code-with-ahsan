import fs from 'fs'
import path from 'path'
import { getFiles } from './mdx'

const root = process.cwd()

export default async function getAllPeople() {
  const type = 'people'
  const files = await getFiles('people')

  const people = []
  // Iterate through each post, putting all found tags into `tags`
  files.forEach((file) => {
    const source = fs.readFileSync(path.join(root, 'data', type, file), 'utf8')
    people.push(JSON.parse(source))
  })

  return people
}
