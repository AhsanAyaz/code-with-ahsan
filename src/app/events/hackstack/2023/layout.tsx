import { Metadata } from 'next'
// @ts-ignore
import siteMetadata from '@/data/siteMetadata'

export const metadata: Metadata = {
  title: 'HackStack Pakistan 2023',
  description: `HackStack 2023 - Pakistan's Premier Full Stack Hackathon. Get ready to ignite your ideas and create the future. Join us for an exhilarating journey of innovation, learning, and camaraderie`,
  openGraph: {
    images: [`${siteMetadata.siteUrl}/static/images/hackstack/cover.svg`],
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
