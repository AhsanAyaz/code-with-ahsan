import React from 'react'
import siteMetadata from '../data/siteMetadata'
import PrimaryLink from './PrimaryLink'

const AboutContent = () => (
  <p className="text-lg font-medium">
    Muhammad Ahsan Ayaz is a Software Architect, Author of the{' '}
    <PrimaryLink href={siteMetadata.ngBook}>Angular Cookbook</PrimaryLink>, and a{' '}
    <PrimaryLink href={siteMetadata.gde}>Google Developers Expert in Angular</PrimaryLink>. He loves
    helping the startup ecosystem and product owners bringing their ideas to life. And he loves to
    teach programming using JavaScript, Angular and Web Technologies on{' '}
    <PrimaryLink href={siteMetadata.twitch}>Twitch</PrimaryLink> and{' '}
    <PrimaryLink href={siteMetadata.youtube}>YouTube</PrimaryLink> via Live Streams, video
    tutorials, and <PrimaryLink href="https://codewithahsan.dev/blog">articles</PrimaryLink>.
    <br />
    Socials: <PrimaryLink href={siteMetadata.socials}>{siteMetadata.socials}</PrimaryLink>
  </p>
)

export default AboutContent
