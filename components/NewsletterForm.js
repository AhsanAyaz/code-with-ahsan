const NewsletterForm = ({ title = `Subscribe to Code with Ahsan's newsletter` }) => {
  return (
    <iframe
      title={title}
      src="https://embeds.beehiiv.com/0593aee7-a9d3-46ed-877b-cdca8a6724dd"
      data-test-id="beehiiv-embed"
      width="480"
      height="320"
      style={{
        borderRadius: '4px',
        margin: 0,
        backgroundColor: 'transparent',
      }}
    ></iframe>
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
