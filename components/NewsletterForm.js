import Script from 'next/script'

const NewsletterForm = ({ title = `Subscribe to Code with Ahsan's newsletter` }) => {
  return (
    <div style={{ height: '40vmin', minHeight: '360px', width: '100%' }}>
      <div
        id="newsletter-container"
        style={{ maxHeight: '400px', overflow: 'hidden', height: '100%' }}
      ></div>
      <Script
        src={`https://cdn.jsdelivr.net/ghost/signup-form@~0.2/umd/signup-form.min.js?ts=${Date.now()}`}
        data-background-color="#08090c"
        data-text-color="#FFFFFF"
        data-button-color="#8f27e0"
        data-button-text-color="#FFFFFF"
        data-title="AHSYNC BYTES"
        data-description="Your Non-Blocking Dose of Web Dev, AI, and Angular."
        data-icon="https://blog.codewithahsan.dev/content/images/size/w192h192/size/w256h256/2025/04/AHSYNC-LOGO-png-1.png"
        data-site="https://blog.codewithahsan.dev/"
        data-locale="en"
        async
        data-height="300"
        onReady={() => {
          console.log('script loaded')
          // Move the signup form from body into our container
          setTimeout(() => {
            const signupRoot = document.querySelector('.gh-signup-root')
            const container = document.getElementById('newsletter-container')

            if (signupRoot && container) {
              // Move the element into our container
              container.appendChild(signupRoot)

              // Set height on the signup root
              signupRoot.style.height = '100%'

              // Style the iframe to fit properly
              const iframeElement = container.querySelector('iframe')
              if (iframeElement) {
                iframeElement.style.maxHeight = '400px'
                iframeElement.style.height = '100%'
                iframeElement.style.width = '100%'
              }

              // Update positioning of elements inside the form
              const positionedDiv = container.querySelector('.gh-signup-root > div')
              if (positionedDiv) {
                positionedDiv.style.position = 'relative'
                positionedDiv.style.height = '100%'
              }
            }
          }, 100) // Slightly longer timeout to ensure the element is created
        }}
      ></Script>
    </div>
  )
}

export default NewsletterForm

export const BlogNewsletterForm = ({ title }) => (
  <div className="flex items-center justify-center">
    <div className="p-6 bg-gray-100 dark:bg-gray-800 sm:px-14 sm:py-8">
      <NewsletterForm title={title} />
    </div>
  </div>
)
