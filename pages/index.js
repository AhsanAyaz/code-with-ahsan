import { PageSEO } from '@/components/SEO'
import siteMetadata from '@/data/siteMetadata'
import Image from 'next/image'
import SocialIcon from '@/components/social-icons'

import NewsletterForm from '@/components/NewsletterForm'
import AboutContent from '../components/AboutContent'

export default function Home() {
  return (
    <>
      <PageSEO title={siteMetadata.title} description={siteMetadata.description} />

      <div className="flex flex-col justify-center h-full">
        <figure className="md:flex bg-gray-100 rounded-xl p-8 md:p-0 dark:bg-gray-800">
          <img
            className="w-24 h-24 md:w-48 md:h-auto md:rounded-none md:rounded-l-xl object-cover rounded-full mx-auto"
            src={siteMetadata.image}
            alt=""
            width="384"
            height="512"
          />
          <div className="pt-6 md:p-8 text-center md:text-left space-y-4">
            <blockquote>
              <AboutContent />
            </blockquote>
          </div>
        </figure>
        <div className="text-center mt-5 parent-container">
          <div className="inline-flex gap-10 icons-container my-8">
            <a href="https://twitch.tv/CodeWithAhsan" target="_blank" rel="noopener noreferrer">
              <SocialIcon kind="twitch" href={siteMetadata.twitch} size="42" />
            </a>
            <a href="https://youtube.com/codewithahsan" target="_blank" rel="noopener noreferrer">
              <SocialIcon
                color="text-red-700"
                kind="youtube"
                href={siteMetadata.youtube}
                size="42"
              />
            </a>
            <a href="https://github.com/code-with-ahsan" target="_blank" rel="noopener noreferrer">
              <SocialIcon kind="github" href={siteMetadata.github} size="42" />
            </a>
          </div>
        </div>
        {siteMetadata.newsletter.provider !== '' && (
          <div className="flex items-center justify-center pt-4">
            <NewsletterForm />
          </div>
        )}
      </div>
    </>
  )
}
