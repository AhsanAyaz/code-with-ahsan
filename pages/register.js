import siteMetadata from '@/data/siteMetadata'
import { PageSEO } from '@/components/SEO'
import AmazonGearItems from '../components/AmazingGeatItems'
import dynamic from 'next/dynamic'
import { useEffect } from 'react'
import { YclLogin } from 'your-courses-library-react'
export default function RegisterPage() {
  const registerSubmit = ({ detail }) => {
    const { email, password } = detail
    console.log(email, password)
  }

  const listenForSubmit = () => {
    document.querySelector('ycl-register').addEventListener('registerSubmit', () => {
      alert('WHAT')
    })
  }

  useEffect(() => {
    // if (process.browser) {
    //   import('your-courses-library/dist/custom-elements').then((m) => {
    //     console.log(m)
    //     m.defineCustomElements()
    //   })
    // }
    // listenForSubmit()
  })

  return (
    <>
      <PageSEO title={`Register - ${siteMetadata.author}`} description={siteMetadata.description} />
      {/* <div
        className="container"
        dangerouslySetInnerHTML={{
          __html: '<ycl-register />',
        }}
      ></div> */}
      <YclLogin onFormSubmitted={registerSubmit} />
    </>
  )
}
