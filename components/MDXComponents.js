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
  table: (props) => <table {...props} />,
  thead: (props) => <thead {...props} />,
  tbody: (props) => <tbody {...props} />,
  tr: (props) => <tr {...props} />,
  th: (props) => <th {...props} />,
  td: (props) => <td {...props} />,
  del: (props) => <del {...props} />,
  input: (props) => <input {...props} />,
  img: (props) => <img {...props} />,
  ul: (props) => <ul {...props} />,
  ol: (props) => <ol {...props} />,
  li: (props) => <li {...props} />,
  blockquote: (props) => <blockquote {...props} />,
  hr: (props) => <hr {...props} />,
  em: (props) => <em {...props} />,
  strong: (props) => <strong {...props} />,
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
