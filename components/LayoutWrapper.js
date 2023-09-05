import siteMetadata from '@/data/siteMetadata'
import headerNavLinks from '@/data/headerNavLinks'
import Link from './Link'
import SectionContainer from './SectionContainer'
import Footer from './Footer'
import MobileNav from './MobileNav'
import ThemeSwitch from './ThemeSwitch'
import Image from './Image'
import ProfileMenu from './ProfileMenu'

const LayoutWrapper = ({ children }) => {
  const linkClassOverrides = (link) => {
    let classes = 'p-1 font-bold text-gray-900 sm:p-4 dark:text-gray-100'
    if (link.href.includes('ng-book')) {
      return `relative w-full sm:w-auto block text-sm font-bold outline-primary-600 ring-2 rounded-md text-primary py-4 px-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 hover:bg-primary-600 hover:text-white hover:outline-none hover:ring-0`
    } else if (link.href.includes('hackstack')) {
      return `${classes} text-red-500 hover:text-red-600 dark:text-red-800 dark:hover:text-red-900 hover:underline underline-offset-8	duration-200`
    }
    return classes
  }
  return (
    <SectionContainer>
      <div className="flex flex-col h-screen">
        <header className="flex items-center justify-between py-0 sm:py-4">
          <nav>
            <Link href="/" aria-label="Code with Ahsan">
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
          </nav>
          <div className="flex items-center text-base leading-5">
            <nav className="hidden sm:flex items-center">
              {headerNavLinks.map((link) => (
                <Link
                  key={link.title}
                  href={link.href}
                  className={`text-center ${linkClassOverrides(link)}`}
                >
                  {link.title}
                </Link>
              ))}
            </nav>
            <ThemeSwitch />
            <MobileNav linkClassOverrides={linkClassOverrides} />
          </div>
          <ProfileMenu />
        </header>
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </SectionContainer>
  )
}

export default LayoutWrapper
