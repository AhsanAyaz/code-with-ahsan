import React from 'react'
import styles from '../../hackstack/hackstack.module.css'
import { PageSEO } from '../../../../components/SEO'
import Image from 'next/image'
import { useTheme } from 'next-themes'
const HackStack2023 = () => {
  const { theme, setTheme, resolvedTheme } = useTheme()
  return (
    <>
      <PageSEO
        title={'HackStack Pakistan 2023'}
        description={`HackStack 2023 - Pakistan's Premier Full Stack Hackathon. Get ready to ignite
        your ideas and create the future. Join us for an exhilarating journey of innovation,
        learning, and camaraderie`}
      />
      <div className={`flex flex-col gap-8 mt-8 ${theme === 'dark' ? styles.dark : styles.light}`}>
        <section className={`${styles.section} relative flex-col !p-0 overflow-hidden`}>
          <span className="w-[150px] h-[150px] -top-4 sm:w-[300px] sm:h-[300px] sm:-top-8 md:w-[400px] md:h-[400px] absolute right-0 md:-top-10 z-0">
            <Image
              src={
                theme === 'dark'
                  ? '/static/images/hackstack/shield-red.svg'
                  : '/static/images/hackstack/shield-gray.svg'
              }
              objectFit="contain"
              alt="Shield gray"
              layout="fill"
            />
          </span>
          <div className="flex gap-4 px-6 pt-12 relative top-10 sm:top-24">
            <div className="flex flex-1 flex-col gap-4 text-center items-center z-10">
              <div className="h-32 w-[70%] relative mx-auto">
                <Image
                  src={
                    theme === 'dark'
                      ? '/static/images/hackstack/logo-dark.svg'
                      : '/static/images/hackstack/logo.svg'
                  }
                  objectFit="contain"
                  layout="fill"
                  alt="hackstack logo"
                />
              </div>
              <h2 className="text-2xl">Ignite Your Ideas, Create the Future</h2>
              <span className="flex-1"></span>
              <a
                href="#about"
                className="rounded-md bg-red-600 text-white w-max px-3 py-1.5 hover:bg-red-900"
              >
                Read more...
              </a>
            </div>
          </div>
          <div className="w-full flex justify-center relative h-32 md:h-64">
            <Image
              src={'/static/images/hackstack/pak-lower.svg'}
              layout="fill"
              alt="pakistan-places logo"
              className="h-32 w-full"
            />
          </div>
        </section>
        <div className="flex gap-8 mb-8 items-center">
          <span className="flex-1 h-32 relative items-center justify-center">
            <Image
              src={
                theme === 'dark'
                  ? '/static/images/hackstack/gdg-kolachi-dark.svg'
                  : '/static/images/hackstack/gdg-kolachi.svg'
              }
              layout="fill"
              alt="gdg-kolachi logo"
              objectFit="contain"
              className="scale-75"
            />
          </span>
          <span className="flex-1 h-64 relative">
            <Image
              src={'/static/images/logo.png'}
              layout="fill"
              alt="cwa logo"
              objectFit="contain"
              className="h-32 w-full"
            />
          </span>
        </div>
        <section id="opportunities" className={`flex gap-8 flex-col md:flex-row`}>
          <article className={`flex-1 ${styles.section}`}>
            <h3>Connect with mentors</h3>
          </article>
          <article className={`flex-1 ${styles.section}`}>
            <h3>Learn and build with the best tech</h3>
          </article>
        </section>
        <section id="about" className={`${styles.section} flex-col`}>
          <h2 className="text-4xl">What is HackStack Pakistan?</h2>
          <p>
            Welcome to HackStack 2023 - Pakistan's Premier Full Stack Hackathon. Get ready to ignite
            your ideas and create the future. Join us for an exhilarating journey of innovation,
            learning, and camaraderie.
          </p>
        </section>
        <section id="register" className={`${styles.section} flex-col`}>
          <h2 className="text-4xl">Register</h2>
          <p>
            Are you ready to ignite your ideas and create the future? Register now as a team of 2-4.
            Make sure to submit your innovative project idea and how you plan to bring it to life.
            Registration closes on [Date].
          </p>
        </section>
        <section id="rules" className={`${styles.section} flex-col`}>
          <h2 className="text-4xl">Rules and Guidelines</h2>
          <p>TBD</p>
        </section>
        <section id="mentors" className={`${styles.section} flex-col`}>
          <h2 className="text-4xl">Mentors</h2>
          <p>
            Meet our group of esteemed mentors who will be guiding teams throughout the event. They
            are industry experts, seasoned developers, and tech innovators ready to share their
            knowledge and expertise.
            <br />
            (mentor cards below)
          </p>
        </section>
        <section id="sponsors" className={`${styles.section} flex-col`}>
          <h2 className="text-4xl">Sponsors</h2>
          <p>
            We are proud to be supported by our generous sponsors who believe in the power of
            innovation and learning.
            <br />
            (sponsor cards below)
          </p>
        </section>
        <section id="faq" className={`${styles.section} flex-col`}>
          <h2 className="text-4xl">FAQ</h2>
          <p>
            Got questions? We've got answers. Check out our frequently asked questions to get the
            information you need
          </p>
          <ul>
            <li>FAQ 1</li>
            <li>FAQ 2</li>
          </ul>
        </section>
        <section id="contact" className={`${styles.section} flex-col`}>
          <h2 className="text-4xl">Contact Us</h2>
          <p>
            Can't find what you're looking for? Get in touch with us directly. Our team is ready to
            assist you. (contact details TBD)
          </p>
        </section>
      </div>
    </>
  )
}

export default HackStack2023
