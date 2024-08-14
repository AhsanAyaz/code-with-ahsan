import React from 'react'
import siteMetadata from '../data/siteMetadata'
import PrimaryLink from './PrimaryLink'

const AboutContent = () => (
  <p className="text-lg font-medium">
    Muhammad Ahsan Ayaz is a Software Architect, an author of 2 world-wide published books (the{' '}
    <PrimaryLink href={siteMetadata.ngBook}>Angular Cookbook</PrimaryLink>), and a{' '}
    <PrimaryLink href={siteMetadata.gde}>Google Developers Expert in Angular</PrimaryLink>. He loves
    helping the startup ecosystem and product owners bring their ideas to life. And to help make the{' '}
    {''}
    world a better place using technology.
    <br />
    Socials: <PrimaryLink href={siteMetadata.socials}>{siteMetadata.socials}</PrimaryLink>
  </p>
)

export default AboutContent
