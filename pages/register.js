import siteMetadata from '@/data/siteMetadata'
import { PageSEO } from '@/components/SEO'
// import { RegisterPage } from 'your-courses-library-react'
export default function Register() {
  const registerSubmit = ({ detail }) => {
    const { email, password } = detail
    console.log(email, password)
  }

  return (
    <>
      <PageSEO title={`Register - ${siteMetadata.author}`} description={siteMetadata.description} />
      {/* <RegisterPage onFormSubmitted={registerSubmit} /> */}
    </>
  )
}
