import siteMetadata from '@/data/siteMetadata'
import projectsData from '@/data/projectsData'
import getAllPeople from '@/lib/people'
import Card from '@/components/Card'
import { PageSEO } from '@/components/SEO'

export async function getStaticProps() {
  const people = await getAllPeople()

  return { props: { people } }
}

export default function Community({ people }) {
  return (
    <>
      <PageSEO
        title={`Community - ${siteMetadata.title}`}
        description={siteMetadata.description}
      />
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        <div className="pt-6 pb-8 space-y-2 md:space-y-5">
          <h1 className="text-3xl font-extrabold leading-9 tracking-tight text-gray-900 dark:text-gray-100 sm:text-4xl sm:leading-10 md:text-6xl md:leading-14">
            Community
          </h1>
          <p className="text-lg leading-7 text-gray-500 dark:text-gray-400">
            Following are the amazing community members associated with
            CodeWithAhsan
          </p>
        </div>
        <div className="container py-12">
          <div className="flex flex-wrap -m-4">
            {people.map((p) => (
              <Card
                key={p.githubUsername}
                title={p.name}
                // description={d.description}
                imgSrc={`https://github.com/${p.githubUsername}.png`}
                href={`https://github.com/${p.githubUsername}`}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
