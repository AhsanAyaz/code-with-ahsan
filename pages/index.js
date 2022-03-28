import { PageSEO } from '@/components/SEO'
import siteMetadata from '@/data/siteMetadata'
import Image from 'next/image'
import SocialIcon from '@/components/social-icons'

import NewsletterForm from '@/components/NewsletterForm'
import AboutContent from '../components/AboutContent'
import Link from 'next/link'

export default function Home() {
  return (
    <>
      <PageSEO title={siteMetadata.title} description={siteMetadata.description} />

      <div className="flex flex-col justify-center h-full">
        <div className="flex items-center mt-8 mb-20">
          <div className="flex flex-col mr-4">
            <div className="text-4xl flex-1 mb-16">
              On a mission to make learning Software Development fun and easy for you!
            </div>
            <div className="flex flex-col gap-4">
              <Link href={'/courses'} passHref>
                <button className="py-2 w-40 ring-1 dark:text-black dark:ring-gray-300  dark:bg-white dark:hover:bg-white dark:ring-offset-black dark:hover:ring-offset-2 ring-primary-500 bg-primary-700 text-white px-4 rounded-md font-medium  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-600 hover:bg-primary-700 hover:text-white ">
                  Take a Course
                </button>
              </Link>
              <Link href={'/blog'} passHref>
                <button className="py-2 w-40 ring-1 dark:text-white dark:ring-gray-300 dark:hover:ring-offset-2 dark:hover:bg-transparent text-primary-500 ring-primary-500 px-4 rounded-md font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-600 hover:text-white dark:ring-offset-black">
                  Read the Blog
                </button>
              </Link>
            </div>
          </div>
          <Image
            src="/static/images/home/landing-vector.svg"
            alt="boy working"
            width={1600}
            height={1200}
            objectFit="contain"
          />
        </div>
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
        <div className="text-sm text-center mt-10">
          <a href="https://www.vecteezy.com/free-vector/human">Human Vectors by Vecteezy</a>
        </div>
      </div>
    </>
  )
}
