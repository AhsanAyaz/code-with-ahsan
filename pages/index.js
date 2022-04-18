import { PageSEO } from '@/components/SEO'
import siteMetadata from '@/data/siteMetadata'
import Image from 'next/image'
import SocialIcon from '@/components/social-icons'

import NewsletterForm from '@/components/NewsletterForm'
import AboutContent from '../components/AboutContent'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import LegitMarkdown from 'components/LegitMarkdown'

export default function Home() {
  const [banners, setBanners] = useState([])

  const getBanners = async () => {
    const response = await fetch(`/api/banners`)
    const { banners } = await response.json()
    setBanners(banners)
  }

  const initFBMessenger = () => {
    var chatbox = document.getElementById('fb-customer-chat')
    chatbox.setAttribute('page_id', '114435320270263')
    chatbox.setAttribute('attribution', 'biz_inbox')
    window.fbAsyncInit = function () {
      // eslint-disable-next-line no-undef
      FB.init({
        xfbml: true,
        version: 'v13.0',
      })
    }
    ;(function (d, s, id) {
      let js,
        fjs = d.getElementsByTagName(s)[0]
      if (d.getElementById(id)) return
      js = d.createElement(s)
      js.id = id
      js.src = 'https://connect.facebook.net/en_US/sdk/xfbml.customerchat.js'
      fjs.parentNode.insertBefore(js, fjs)
    })(document, 'script', 'facebook-jssdk')
  }

  useEffect(() => {
    getBanners()
    if (!location.href.includes('localhost')) {
      initFBMessenger()
    }
  }, [])
  return (
    <>
      <PageSEO title={siteMetadata.title} description={siteMetadata.description} />
      {banners.map((banner, index) => (
        <div
          className="top-banner mb-4 relative bg-indigo-700 text-white px-6 py-3 rounded-md"
          key={index}
        >
          <span className="animate-ping absolute -right-1 -top-1 inline-flex h-4 w-4 rounded-full bg-yellow-700 dark:bg-yellow-300 z-10 opacity-75"></span>
          <LegitMarkdown
            components={{
              a: (props) => (
                <a className="text-yellow-300" target={'_blank'} {...props}>
                  {props.children}
                </a>
              ),
            }}
          >
            {banner.attributes.content}
          </LegitMarkdown>
        </div>
      ))}
      <div className="flex flex-col justify-center">
        <div className="flex flex-col items-start mb-6 relative">
          <Image
            src="/static/images/banner.png"
            alt="boy working"
            width={1600}
            height={1000}
            objectFit="contain"
          />
          <div className="flex flex-col pr-6 absolute bottom-0 top-0 items-end justify-center h-full w-full gap-4">
            <Link href={'/courses'} passHref>
              <button className="py-1 px-2 lg:py-2 lg:px-4 w-32 lg:w-40 ring-1 dark:text-black dark:ring-gray-300  dark:bg-white dark:hover:bg-white dark:ring-offset-black dark:hover:ring-offset-2 ring-primary-500 bg-primary-700 text-white rounded-md font-medium  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-600 hover:bg-primary-700 hover:text-white sm:text-sm md:text-base">
                Take a Course
              </button>
            </Link>
            <Link href={'/blog'} passHref>
              <button className="py-1 px-2 lg:py-2 lg:px-4 w-32 lg:w-40 ring-1 bg-black text-white ring-gray-300 hover:ring-offset-2 hover:bg-transparent rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2  hover:text-white ring-offset-black">
                Read the Blog
              </button>
            </Link>
          </div>
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
            <SocialIcon kind="twitch" href={siteMetadata.twitch} size="42" />

            <SocialIcon color="text-red-700" kind="youtube" href={siteMetadata.youtube} size="42" />
            <SocialIcon kind="github" href={siteMetadata.github} size="42" />
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
      <div id="fb-root"></div>

      <div id="fb-customer-chat" className="fb-customerchat"></div>
    </>
  )
}
