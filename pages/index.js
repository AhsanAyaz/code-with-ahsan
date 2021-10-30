import { PageSEO } from '@/components/SEO'
import siteMetadata from '@/data/siteMetadata'
import Image from 'next/image'
import SocialIcon from '@/components/social-icons'

import NewsletterForm from '@/components/NewsletterForm'

export default function Home() {
  return (
    <>
      <PageSEO title={siteMetadata.title} description={siteMetadata.description} />
      <div className="text-center mt-5 parent-container">
        <Image
          width="150"
          height="150"
          src={'/static/images/logo.png'}
          objectFit={'cover'}
          alt={'CodeWithAhsan logo'}
        />
        <p className="mt-2">
          <b> Learning amazing things, meeting amazing people, everyday! :)</b>
        </p>
        <div className="py-0 my-2 name-container">
          <h1
            style={{
              color: 'black',
            }}
            className="text-3xl sm:text-4xl md:text-6xl"
          >
            <span className="first-name dark:text-white">{siteMetadata.title}</span>&nbsp;
          </h1>
          <p className="my-2">
            <i>The one stop shop to have fun with amazing people, and to code of course.</i>
          </p>
        </div>
        <hr className="my-3 w-25" />
        <div className="inline-flex gap-10 icons-container my-8">
          <a href="https://twitch.tv/CodeWithAhsan" target="_blank" rel="noopener noreferrer">
            <SocialIcon kind="twitch" href={siteMetadata.twitch} size="42" />
          </a>
          <a href="https://facebook.com/codewithahsan" target="_blank" rel="noopener noreferrer">
            <SocialIcon kind="facebook" href={siteMetadata.facebook} size="42" />
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
    </>
  )
}
