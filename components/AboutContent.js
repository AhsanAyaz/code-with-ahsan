import React from 'react'
import siteMetadata from '../data/siteMetadata'

const AboutContent = () => {
  return (
    <>
      <p className="text-lg font-medium">
        Muhammad Ahsan Ayaz is a Software Architect and a{' '}
        <a target="_blank" rel="noreferrer" className="text-primary-500" href={siteMetadata.gde}>
          Google Developers Expert in Angular
        </a>
        . He loves helping the startup ecosystem and product owners bringing their ideas to life.
        And he loves to{' '}
        <a
          className="text-primary-500"
          target="_blank"
          rel="noreferrer"
          href={siteMetadata.youtube}
        >
          teach programming
        </a>{' '}
        using JavaScript, Angular and Web Technologies.
        <br />
        Socials:{' '}
        <a
          className="text-primary-500"
          target="_blank"
          rel="noreferrer"
          href={siteMetadata.socials}
        >
          {siteMetadata.socials}
        </a>
      </p>
    </>
  )
}

export default AboutContent
