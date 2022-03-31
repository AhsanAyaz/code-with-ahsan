import siteMetadata from '@/data/siteMetadata'
import headerNavLinks from '@/data/headerNavLinks'
import Link from './Link'
import SectionContainer from './SectionContainer'
import Footer from './Footer'
import MobileNav from './MobileNav'
import ThemeSwitch from './ThemeSwitch'
import Image from './Image'

const LayoutWrapper = ({ children }) => {
  const highlightContext = `relative w-full sm:w-auto block text-sm font-semibold outline-primary-600 ring-2 rounded-lg text-primary py-4 px-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 hover:bg-primary-600 hover:text-white hover:outline-none hover:ring-0`
  return (
    <SectionContainer>
      <div className="flex flex-col h-screen">
        <header className="flex items-center justify-between py-0 sm:py-4">
          <div>
            <Link href="/" aria-label="Tailwind CSS Blog">
              <div className="flex items-center justify-between">
                <Image
                  src={siteMetadata.siteLogo}
                  alt="site logo"
                  width={100}
                  height={100}
                  objectFit={'cover'}
                />
              </div>
            </Link>
          </div>
          <div className="flex items-center text-base leading-5">
            <div className="hidden sm:flex items-center">
              {headerNavLinks.map((link) => (
                <Link
                  key={link.title}
                  href={link.href}
                  className={`text-center ${
                    link.href.includes('ng-book')
                      ? highlightContext
                      : 'p-1 font-medium text-gray-900 sm:p-4 dark:text-gray-100'
                  }`}
                >
                  {link.title}
                </Link>
              ))}
            </div>
            <ThemeSwitch />
            <MobileNav />
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </SectionContainer>
  )
}

export default LayoutWrapper
