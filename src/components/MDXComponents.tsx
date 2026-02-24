/* eslint-disable react/display-name */
import { useMemo, ReactNode } from 'react'
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const MDXComponents: Record<string, React.FC<any> | string> = {
  Image,
  ImageWithBg,
  IonicCourse,
  AboutContent,
  PromotionBanner,
  EmbeddedYouTubeVideo,
  BuyMeACoffee,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TOCInline: TOCInline as any, // TOCInline might have specific props, casting to any for generic mdx map
  a: CustomLink,
  pre: Pre,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table: (props: any) => <table {...props} />,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  thead: (props: any) => <thead {...props} />,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tbody: (props: any) => <tbody {...props} />,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tr: (props: any) => <tr {...props} />,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  th: (props: any) => <th {...props} />,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  td: (props: any) => <td {...props} />,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  del: (props: any) => <del {...props} />,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  input: (props: any) => <input {...props} />,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  img: (props: any) => {
    if (props.width && props.height) {
      return <Image src={props.src} alt={props.alt || ""} width={Number(props.width)} height={Number(props.height)} className={props.className} />;
    }
    // For images without explicit dimensions (e.g., from markdown), contain layout shift
    return <img {...props} style={{ ...props.style, maxWidth: "100%", height: "auto" }} loading="lazy" decoding="async" />;
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ul: (props: any) => <ul {...props} />,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ol: (props: any) => <ol {...props} />,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  li: (props: any) => <li {...props} />,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  blockquote: (props: any) => <blockquote {...props} />,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  hr: (props: any) => <hr {...props} />,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  em: (props: any) => <em {...props} />,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  strong: (props: any) => <strong {...props} />,
  BlogNewsletterForm: BlogNewsletterForm,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  wrapper: ({ components, layout, ...rest }: any) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Layout = require(`../layouts/${layout}`).default
    return <Layout {...rest} />
  },
}

interface MDXLayoutRendererProps {
  layout: string
  mdxSource: string
  [key: string]: unknown
}

export const MDXLayoutRenderer = ({ layout, mdxSource, ...rest }: MDXLayoutRendererProps) => {
  const MDXLayout = useMemo(() => getMDXComponent(mdxSource), [mdxSource])

  return <MDXLayout layout={layout} components={MDXComponents as any} {...rest} />
}
