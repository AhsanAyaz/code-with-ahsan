import axios from 'axios'
import qs from 'qs'
import { PageSEO } from '@/components/SEO'
import LegitMarkdown from '@/components/LegitMarkdown'
import ResourcesLinks from '@/components/ResourcesLinks'
import Post from '../classes/Post.class'
import { STRAPI_POST_QUERY_OBJ } from '../lib/strapiQueryHelpers'

const strapiUrl = process.env.STRAPI_URL
const strapiAPIKey = process.env.STRAPI_API_KEY
// Default to the provided doc ID to work out-of-the-box, but allow override via env
const RATE_CARD_DOC_ID = process.env.STRAPI_RATE_CARD_DOC_ID || 'tyzwd2y813dr8sldugy0y51l'

export async function getStaticProps() {
  const postQuery = qs.stringify(
    {
      ...STRAPI_POST_QUERY_OBJ,
      filters: {
        documentId: {
          $eq: RATE_CARD_DOC_ID,
        },
      },
    },
    { encodeValuesOnly: true }
  )

  const url = `${strapiUrl}/api/posts?${postQuery}`

  const postResp = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${strapiAPIKey}`,
    },
  })

  if (!postResp.data?.data?.length) {
    return { notFound: true }
  }

  const post = new Post(postResp.data.data[0])

  return {
    props: {
      postStr: JSON.stringify(post),
    },
    revalidate: 3600, // ISR: refresh every hour
  }
}

export default function RatesPage({ postStr }) {
  const post = JSON.parse(postStr)

  return (
    <>
      <PageSEO
        title={post.title || 'Creator Rate Card'}
        description={post.description || 'My creator rate card and pricing information'}
      />
      <header className="mb-6">
        <h1 className="text-4xl text-center">{post.title || 'Creator Rate Card'}</h1>
      </header>

      {post.description && (
        <section className="mt-8 mb-4">
          <p>{post.description}</p>
        </section>
      )}

      {post.article && (
        <section>
          <LegitMarkdown
            components={{
              a: (props) => (
                <a className="text-yellow-300" target={'_blank'} rel="noreferrer" {...props}>
                  {props.children}
                </a>
              ),
            }}
          >
            {post.article}
          </LegitMarkdown>
        </section>
      )}

      {post.resources?.length > 0 && (
        <section className="mt-4">
          <ResourcesLinks resources={post.resources} />
        </section>
      )}
    </>
  )
}
