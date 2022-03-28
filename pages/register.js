import siteMetadata from '@/data/siteMetadata'
import { PageSEO } from '@/components/SEO'
export default function Register() {
  const registerSubmit = ({ detail }) => {
    const { email, password } = detail
    console.log(email, password)
  }

  return (
    <>
      <PageSEO title={`Register - ${siteMetadata.author}`} description={siteMetadata.description} />
    </>
  )
}
