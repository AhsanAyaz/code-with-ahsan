import siteMetadata from '@/data/siteMetadata'
import { PageSEO } from '@/components/SEO'
import AmazonGearItems from '../components/AmazingGeatItems'

export default function Blog() {
  return (
    <>
      <PageSEO title={`Blog - ${siteMetadata.author}`} description={siteMetadata.description} />
      <AmazonGearItems />
    </>
  )
}
