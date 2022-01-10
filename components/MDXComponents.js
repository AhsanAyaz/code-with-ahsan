/* eslint-disable react/display-name */
import { useMemo } from 'react'
import { getMDXComponent } from 'mdx-bundler/client'
import Image from './Image'
import ImageWithBg from './ImageWithBg'
import PromotionBanner from './PromotionBanner'
import EmbeddedYouTubeVideo from './EmbeddedYouTubeVideo'
import BuyMeACoffee from './BuyMeACoffee'
import IonicCourse from './IonicCourse'
import CustomLink from './Link'
import TOCInline from './TOCInline'
import AboutContent from './AboutContent'
import Pre from './Pre'
import { BlogNewsletterForm } from './NewsletterForm'

export const MDXComponents = {
  Image,
  ImageWithBg,
  IonicCourse,
  AboutContent,
  PromotionBanner,
  EmbeddedYouTubeVideo,
  BuyMeACoffee,
  TOCInline,
  a: CustomLink,
  pre: Pre,
  BlogNewsletterForm: BlogNewsletterForm,
  wrapper: ({ components, layout, ...rest }) => {
    const Layout = require(`../layouts/${layout}`).default
    return <Layout {...rest} />
  },
}

export const MDXLayoutRenderer = ({ layout, mdxSource, ...rest }) => {
  const MDXLayout = useMemo(() => getMDXComponent(mdxSource), [mdxSource])

  return <MDXLayout layout={layout} components={MDXComponents} {...rest} />
}
