import siteMetadata from '@/data/siteMetadata'
import { PageSEO } from '@/components/SEO'
// import { LoginPage } from 'your-courses-library-react'
export default function Login() {
  const loginSubmit = ({ detail }) => {
    const { email, password } = detail
    console.log(email, password)
  }

  return (
    <>
      <PageSEO title={`Login - ${siteMetadata.author}`} description={siteMetadata.description} />
      {/* <LoginPage onFormSubmitted={loginSubmit} /> */}
    </>
  )
}
