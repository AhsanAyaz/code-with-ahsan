// @ts-ignore
import { MDXLayoutRenderer } from '@/components/MDXComponents'
// @ts-ignore
import { getFileBySlug } from '@/lib/mdx'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About - Muhammad Ahsan Ayaz',
  description: 'About me - Muhammad Ahsan Ayaz',
}

const DEFAULT_LAYOUT = 'AuthorLayout'

export default async function About() {
  const authorDetails = await getFileBySlug('authors', 'ahsan_detailed')
  const { mdxSource, frontMatter } = authorDetails

  return (
    <MDXLayoutRenderer
      layout={(frontMatter as any).layout || DEFAULT_LAYOUT}
      mdxSource={mdxSource}
      frontMatter={frontMatter}
    />
  )
}
