import siteMetadata from '@/data/siteMetadata'
import { PageSEO } from '@/components/SEO'
// Assuming you might have a local image for the book cover
import Image from 'next/image'
// Ensure this path is correct for your book cover image
// Example path: /public/static/images/books/mastering-angular-signals-3d.png
// You already have this imported in your code snippet:
// import bookCover from '@/public/static/images/books/mastering-angular-signals-3d.png' // Make sure the path matches

export default function ModernAngularSignalsBookPage() {
  const bookTitle = 'Mastering Angular Signals'
  const authorName = 'Muhammad Ahsan Ayaz'
  const authorCreds = 'GDE in Angular, Speaker, Software Architect, Author of Angular Cookbook'
  const githubRepo = 'https://github.com/AhsanAyaz/modern-angular-signals-book'
  // Temporary CTA Link - remember to update this later!
  const ctaLink = 'https://www.amazon.com/dp/B0FF9LSHJN/'
  const ctaText = 'Get your copy' // Or 'Learn More & Buy'

  // You can also add a description or any other relevant information herec
  const ctaButton = () => (
    <div className="not-prose">
      <a
        href={ctaLink}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center px-6 py-3 border border-transparent !font-medium rounded-md shadow !text-white bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600"
      >
        {ctaText}
      </a>
    </div>
  )

  return (
    <>
      <PageSEO
        title={`${bookTitle} by ${authorName} - ${siteMetadata.author}`}
        description="Unlock the power of Angular Signals! A comprehensive guide by Muhammad Ahsan Ayaz covering core concepts, advanced patterns, testing, and migration strategies for building performant and reactive Angular applications."
      />
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        <div className="pt-6 pb-8 space-y-2 md:space-y-5">
          <h1 className="text-3xl font-extrabold leading-9 tracking-tight text-gray-900 dark:text-gray-100 sm:text-4xl sm:leading-10 md:text-6xl md:leading-14 text-center">
            {bookTitle}
          </h1>
          <p className="text-center text-lg leading-7 text-gray-500 dark:text-gray-400">
            A Practical Guide to Modern Reactivity, Performance, and Migration
          </p>
          <p className="text-center text-sm leading-5 text-gray-500 dark:text-gray-400">
            By {authorName} - {authorCreds}
          </p>
          {/* CTA Button below title */}
          <div className="flex justify-center mt-6">{ctaButton()}</div>
        </div>

        <div className="prose dark:prose-dark max-w-none pt-8 pb-8">
          <div className="flex flex-col items-center md:flex-row md:items-start md:space-x-8">
            {/* Book cover image */}
            <div className="flex-shrink-0 mb-4 md:mb-0">
              {/* Ensure the src path is correct for your image */}
              <Image
                src={'/static/images/books/mastering-angular-signals-3d.png'}
                alt={bookTitle}
                width={250} // Adjust size as needed
                height={350} // Adjust size as needed
                className="rounded-md shadow-lg"
              />
            </div>
            <div className="flex-grow">
              <h2>About This Book</h2>
              <p>
                Angular Signals represent a fundamental shift in how we build reactive applications.
                This book is your comprehensive guide to mastering this powerful new reactivity
                model, enabling you to build more efficient, maintainable, and performant Angular
                applications.
              </p>
              <p>
                Authored by Muhammad Ahsan Ayaz, a Google Developer Expert in Angular and seasoned
                Software Architect, <em>Mastering Angular Signals</em> distills practical knowledge
                from years of experience working with Angular.
              </p>

              <h3>What You Will Learn</h3>
              <p>
                Journey from the foundational building blocks to advanced techniques. This book
                covers:
              </p>
              <ul>
                <li>
                  The core concepts: <code>signal()</code>, <code>computed()</code>, and{' '}
                  <code>effect()</code>
                </li>
                <li>
                  Managing asynchronous operations with <code>resource()</code> and{' '}
                  <code>rxResource()</code>
                </li>
                <li>
                  Seamless component communication using signal-based <code>input()</code>,{' '}
                  <code>output()</code>, and <code>model()</code> APIs
                </li>
                <li>Effective strategies for testing your Signal-based code</li>
                <li>Practical techniques for migrating existing RxJS-heavy applications</li>
                <li>Performance considerations and architectural best practices</li>
              </ul>

              {/* CTA Button after What You Will Learn */}
              <div className="flex justify-center my-6">
                {' '}
                {/* Added margin for spacing */}
                {ctaButton()}{' '}
              </div>

              <h3>Dive into Practical Examples</h3>
              <p>
                Build confidence with hands-on examples demonstrating real-world scenarios,
                including:
              </p>
              <ul>
                <li>Managing component state and user input</li>
                <li>Handling data fetching from APIs</li>
                <li>Building interactive lists with DOM interaction</li>
                <li>Implementing notification panels and shopping carts</li>
              </ul>
              <p>A dedicated code repository is available on GitHub:</p>
              <p>
                <a href={githubRepo} target="_blank" rel="noopener noreferrer">
                  {githubRepo}
                </a>
              </p>

              {/* CTA Button after Dive into Practical Examples */}
              <div className="flex justify-center my-6">
                {' '}
                {/* Added margin for spacing */}
                {ctaButton()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// Optional: Inherit showAds property if needed
// ModernAngularSignalsBookPage.showAds = true
