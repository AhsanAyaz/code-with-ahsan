import { useState } from 'react'
import Link from './Link'
import headerNavLinks from '@/data/headerNavLinks'

interface LinkItem {
  href: string
  title: string
}

interface MobileNavProps {
  linkClassOverrides: (link: LinkItem) => string
}

const MobileNav = ({ linkClassOverrides }: MobileNavProps) => {
  const [navShow, setNavShow] = useState(false)

  const onToggleNav = () => {
    setNavShow((status) => {
      if (status) {
        document.body.style.overflow = 'auto'
      } else {
        // Prevent scrolling
        document.body.style.overflow = 'hidden'
      }
      return !status
    })
  }

  const allLinks = headerNavLinks
  const primaryLinks = allLinks.filter(
    (link) =>
      !(
        link.href === '/rates' ||
        link.title === 'Rates' ||
        link.title === 'Discord' ||
        link.href.includes('discord.gg')
      )
  )
  const moreLinks = allLinks.filter(
    (link) =>
      link.href === '/rates' ||
      link.title === 'Rates' ||
      link.title === 'Discord' ||
      link.href.includes('discord.gg')
  )
  const [moreOpen, setMoreOpen] = useState(false)
  const highlightContext = `relative w-full sm:w-auto block text-sm font-semibold bg-primary-600 rounded-md text-white py-3 px-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 hover:bg-primary-500`
  return (
    <div className="sm:hidden z-50">
      <button
        type="button"
        className="w-8 h-8 ml-1 mr-1 rounded"
        aria-label="Toggle Menu"
        onClick={onToggleNav}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="text-base-content"
        >
          {navShow ? (
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
              type="pass-through"
            />
          ) : (
            <path
              fillRule="evenodd"
              d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
              clipRule="evenodd"
            />
          )}
        </svg>
      </button>
      <div
        className={`fixed w-full h-full top-24 right-0 bg-gray-200 dark:bg-gray-800 opacity-95 z-10 transform ease-in-out duration-300 ${
          navShow ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <button
          type="button"
          aria-label="toggle modal"
          className="fixed w-full h-full cursor-auto focus:outline-none"
          onClick={onToggleNav}
        ></button>
        <nav className="fixed h-full mt-8">
          {primaryLinks.map((link) => (
            <div key={link.title} className="px-12 py-4">
              <Link
                href={link.href}
                className={`text-2xl font-bold tracking-widest text-base-content${linkClassOverrides(
                  link
                )} ${link.href.includes('ng-book') ? highlightContext : ''}`}
                onClick={onToggleNav}
              >
                {link.title}
              </Link>
            </div>
          ))}
          {moreLinks.length > 0 && (
            <div className="px-12 py-4">
              <button
                type="button"
                aria-expanded={moreOpen}
                onClick={() => setMoreOpen((v) => !v)}
                className="text-2xl font-bold tracking-widest text-base-content flex items-center gap-2"
              >
                More
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-5 w-5 transition-transform ${moreOpen ? 'rotate-180' : ''}`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
              {moreOpen && (
                <div className="mt-2 ml-6">
                  {moreLinks.map((link) => (
                    <div key={link.title} className="py-2">
                      <Link
                        href={link.href}
                        className={`text-xl font-semibold tracking-wide text-base-content${linkClassOverrides(
                          link
                        )}`}
                        onClick={onToggleNav}
                      >
                        {link.title}
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>
      </div>
    </div>
  )
}

export default MobileNav
