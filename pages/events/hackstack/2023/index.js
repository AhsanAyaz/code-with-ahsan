import React from 'react'
import styles from '../../hackstack/hackstack.module.css'
import { PageSEO } from '../../../../components/SEO'
import Image from 'next/image'
import { useTheme } from 'next-themes'
import siteMetadata from '@/data/siteMetadata'
import Button from '../../../../components/Button'

export const HackStack2023Base = () => {
  const { resolvedTheme: theme } = useTheme()
  const goToAnchor = (selector) => {
    const el = document.querySelector(selector)
    el.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }
  return (
    <>
      <PageSEO
        title={'HackStack Pakistan 2023'}
        description={`HackStack 2023 - Pakistan's Premier Full Stack Hackathon. Get ready to ignite
  your ideas and create the future. Join us for an exhilarating journey of innovation,
  learning, and camaraderie`}
        imageUrl={`${siteMetadata.siteUrl}/static/images/hackstack/cover.svg`}
      />
      <div className={`flex flex-col gap-8 mt-8 ${theme !== 'light' ? styles.dark : styles.light}`}>
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
              <Button
                onClick={() => {
                  goToAnchor('#about')
                }}
                color="hackstack"
              >
                Read more...
              </Button>
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
        <div className="flex gap-8 items-center">
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
              className="scale-75 duration-200 cursor-pointer hover:opacity-70"
              onClick={() => {
                window.open('https://gdg.community.dev/gdg-kolachi/', '_blank')
              }}
            />
          </span>
          <span className="flex-1 h-64 relative">
            <Image
              src={'/static/images/logo.png'}
              layout="fill"
              alt="cwa logo"
              objectFit="contain"
              className="h-32 w-full duration-200 cursor-pointer hover:opacity-70"
              onClick={() => {
                window.open('https://codewithahsan.dev/', '_blank')
              }}
            />
          </span>
        </div>
        <section id="about" className={`${styles.section} flex-col`}>
          <h2 className="text-4xl">What is HackStack Pakistan?</h2>
          <p>
            Hackstack Pakistan 2023 is a 2-week hybrid hackathon focused on Full Stack Development
            with cutting edge-technologies including{' '}
            <a className={styles.link} href="https://angular.io" target="_blank" rel="noreferrer">
              Angular
            </a>
            , a popular web framework for building front-end applications super-powered by Google.
            This hackathon is organized by the{' '}
            <a
              className={styles.link}
              href="https://codewithahsan.dev"
              target="_blank"
              rel="noreferrer"
            >
              Code with Ahsan
            </a>{' '}
            Community and{' '}
            <a
              href="https://gdg.community.dev/gdg-kolachi/"
              className={styles.link}
              target="_blank"
              rel="noreferrer"
            >
              GDG Kolachi
            </a>{' '}
            to inspire collaboration, innovation, and building. The event presents an awesome
            opportunity for developers and university students to challenge themselves and take
            their hacking skills to the next level.{' '}
          </p>
        </section>
        <section className="flex-col-reverse sm:flex-row flex gap-8">
          <Button
            onClick={() => {
              goToAnchor('#rules')
            }}
            className={'flex-1'}
          >
            View Details
          </Button>
          <Button
            onClick={() => {
              window.open('https://forms.gle/TmVF8XcTS3D9JU2C8', '_blank')
            }}
            className={`flex-1 ${styles.shake}`}
            color="hackstack"
          >
            Register Now
          </Button>
        </section>
        <section id="rules" className={`${styles.section} flex-col`}>
          <h2 className="text-4xl">Rules and Guidelines</h2>
          <p>
            <ul className="list-disc px-4">
              <li>
                Teams can consist of a minimum of 2 members and a maximum of 4 members. Participants
                must register as teams rather than individuals. Teams are required to be formed
                prior to the event.
              </li>
              <li>
                As part of the registration process, each team must submit a concise proposal for
                their hackathon project. The proposal should encompass the following details:
                <ul className="list-disc pl-8">
                  <li>
                    Project Idea: A description of the problem the team will address, and their
                    proposed solution.
                  </li>
                  <li>
                    Tech Stack: A list of the programming languages, frameworks, and tools the team
                    plans to use.
                  </li>
                  <li>
                    Roles of Team Members: An outline of each team member's role in the project,
                    including their areas of expertise and primary responsibilities.
                  </li>
                  <li>
                    Timeline: A rough timeline showing how the team plans to break down their
                    project into manageable tasks, and how they plan to allocate their time over the
                    course of the hackathon.
                  </li>
                </ul>
              </li>
              <li>
                All projects must be developed as Full Stack Web Applications. Projects can be
                mobile-first web apps, progressive web apps, or regular web applications. But they
                must include both a frontend, some database, and a backend server.
              </li>
              <li>
                The Hackathon will happen in three rounds:
                <ul className="list-disc pl-8">
                  <li>
                    Preliminary Round: This functions as the screening round. Your proposals will be
                    evaluated by the organizers based on several factors. If your team is selected,
                    you will progress to the Online Hackathon stage, which spans two weeks.
                  </li>
                  <li>
                    Online Hackathon During this two-week-long phase, teams will develop their
                    proposed ideas. Mentors will provide valuable feedback to refine these ideas.
                    Teams will also need to join the Discord server and provide updates regarding
                    the development progress of their projects throughout the hackathon.
                  </li>
                  <li>
                    On-Site Event Following the Online Hackathon, projects will be evaluated. The
                    top 10 teams will be invited to an on-site event to present and pitch their
                    projects. Prizes will be awarded to the top 3 teams.
                  </li>
                </ul>
              </li>
              <li>
                All work on the project should be done during the hackathon. Pre-existing projects
                or code written before the hackathon cannot be submitted.
              </li>
              <li>
                Teams must submit their final projects via GitHub. They will be provided GitHub
                repositories where they will submit their code. Finally, they will be filling out a
                submission form including a link to their demo site, along with a short demo video.
              </li>
              <li>
                While the primary focus is on full-stack development, there are no specific
                restrictions on the languages, libraries, or frameworks that can be used. However,
                for the frontend, teams must use Angular (Google's Framework for Web Development).
              </li>
              <li>
                Projects will be evaluated based on criteria such as creativity, technical
                complexity, design, and functionality. The decisions made by the judges are final.
              </li>
            </ul>{' '}
          </p>
        </section>
        <section id="mentors" className={`${styles.section} flex-col`}>
          <h2 className="text-4xl">Mentors</h2>
          <p>To be announced</p>
          {/* <p>
            Meet our group of esteemed mentors who will be guiding teams throughout the event. They
            are industry experts, seasoned developers, and tech innovators ready to share their
            knowledge and expertise.
            <br />
            (mentor cards below)
          </p> */}
        </section>
        <section id="sponsors" className={`${styles.section} flex-col`}>
          <h2 className="text-4xl">Sponsors</h2>
          <p>To be announced</p>
          {/* <p>
            We are proud to be supported by our generous sponsors who believe in the power of
            innovation and learning.
            <br />
            (sponsor cards below)
          </p> */}
        </section>
        <section id="faq" className={`${styles.section} flex-col`}>
          <h2 className="text-4xl">FAQ</h2>
          <p>
            Got questions? We've got answers. Check out our frequently asked questions to get the
            information you need
          </p>
          <ul className="list-disc flex flex-col gap-4 px-4">
            <li>
              <h5>Can individuals participate in the hackathon, or is it limited to teams?</h5>
              <p>
                The hackathon is designed for teams consisting of 2 to 4 members. Participants are
                required to register as teams, rather than as individuals.
              </p>
            </li>
            <li>
              <h5>Are there specific guidelines for the hackathon proposal?</h5>
              <p>
                Yes, see the{' '}
                <a href="#rules" className={styles.link}>
                  Rules
                </a>
              </p>
            </li>
            <li>
              <h5>
                Can projects be pre-existing or must they be developed entirely during the
                hackathon?
              </h5>
              <p>
                Projects must be developed entirely during the hackathon. Pre-existing projects or
                code written before the event cannot be submitted.
              </p>
            </li>
            <li>
              <h5>What is the emphasis of the hackathon in terms of project type?</h5>
              <p>
                he hackathon focuses on full-stack development, requiring both frontend and backend
                components in the project. Projects can encompass mobile-first web apps, progressive
                web apps, or regular web applications.
              </p>
            </li>
            <li>
              <h5>What are the different rounds of the hackathon?</h5>
              <p>
                The hackathon consists of three rounds: Preliminary Round: Screening round for team
                selection. Online Hackathon: A two-week-long development phase with mentor feedback.
                On-Site Event: The top 10 teams present and pitch their projects in person.
              </p>
            </li>
            <li>
              <h5>Is there a specific technology framework emphasized during the hackathon?</h5>
              <p>
                The framework for front end must be Angular (Google's Framework for Web). You can
                choose any databases, frameworks, or backend languages.
              </p>
            </li>
            <li>
              <h5>How are projects evaluated during the hackathon?</h5>
              <p>
                Projects are evaluated based on creativity, technical difficulty, design, and
                functionality. The decisions made by the judges are final.
              </p>
            </li>
            <li>
              <h5>Are there prizes for the top-performing teams?</h5>
              <p>
                Yes, the top 3 teams will be awarded prizes based on their project's performance and
                quality.
              </p>
            </li>
            <li>
              <h5>How should final projects be submitted?</h5>
              <p>
                Teams will be provided GitHub repositories where they will submit their code.
                Finally, they will be filling a submission form including a link to their demo site
                along with a short demo video.
              </p>
            </li>
            <li>
              <h5>How can teams interact and provide updates during the Online Hackathon?</h5>
              <p>
                eams are required to join the Discord server. This platform will be used for
                communication, updates, and mentor feedback throughout the Online Hackathon.
              </p>
            </li>
          </ul>
        </section>
        <section id="team" className={`${styles.section} flex-col`}>
          <h2>Team</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <article>
              <h4>Organizers</h4>
              <ul>
                <li>Umar Ahmed (Organizer)</li>
                <li>Muhammad Ahsan Ayaz (Organizer)</li>
                <li>Hira Tariq (Advisor)</li>
                <li>Samima Khan (Designs)</li>
                <li>Danella Patrick (Outreach and PR)</li>
              </ul>
            </article>
            <article>
              <h4>Core Team</h4>
              <ul>
                <li>Irum Ghafoor (Outreach and PR)</li>
                <li>Hassam Javed (Designs)</li>
                <li>Sajeel Ahmed (Marketing)</li>
                <li>Abdullah (Content Writing)</li>
                <li>Kiran Ghafoor (Socials)</li>
              </ul>
            </article>
            <article>
              <h4>Volunteers</h4>
              <ul>
                <li>Wajid (Discord Moderator)</li>
                <li>Ashhad (Discord Moderator)</li>
              </ul>
            </article>
          </div>
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

const HackStack2023 = () => {
  return <HackStack2023Base />
}

export default HackStack2023
