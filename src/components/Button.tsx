import React, { ReactNode, MouseEventHandler } from 'react'
import Link from 'next/link'

interface ButtonProps {
  onClick?: MouseEventHandler<HTMLButtonElement>
  children: ReactNode
  color?: 'primary' | 'accent' | 'hackstack' | string
  title?: string
  className?: string
  href?: string
}

const Button: React.FC<ButtonProps> = ({
  onClick,
  children,
  color = '',
  title,
  className,
  href,
}) => {
  let colorClass = ''
  switch (color) {
    case 'primary':
      colorClass = `hover:bg-primary-700 dark:hover:bg-primary-700 ring-primary-500 bg-primary-500 dark:bg-primary-800 dark:ring-primary-800 text-white hover:text-white`
      break
    case 'accent':
      colorClass = `hover:bg-yellow-600 dark:hover:bg-yellow-800 ring-yellow-500 bg-yellow-500 dark:bg-yellow-700 text-white hover:text-white`
      break
    case 'hackstack':
      colorClass = `hover:bg-red-600 dark:hover:bg-red-900 ring-red-500 bg-red-500 dark:bg-red-800 text-white hover:text-white`
      break
    default:
      colorClass = `dark:hover:bg-slate-800 ring-slate-500 bg-slate-100 text-slate-900 hover:bg-slate-700 dark:bg-slate-700 dark:text-white hover:text-white`
      break
  }

  // If href is external, use anchor tag, otherwise use Next.js Link?
  // The original code used <a> with target="_blank", implying external links mainly.
  // But standard practice for internal links is Link.
  // Original Code: return href ? (<a ... >) : (<button ... >)
  // I will keep the <a> tag for now to maintain behavior, as it has target="_blank" hardcoded.

  return href ? (
    <a
      href={href}
      title={title || ''}
      target="_blank"
      rel="noopener noreferrer"
      role="button"
      className={`px-4 py-2 ring-1 dark:ring-offset-black dark:hover:ring-offset-2 ${colorClass} rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 ${className || ''}`}
    >
      {children}
    </a>
  ) : (
    <button
      onClick={onClick}
      title={title || ''}
      className={`px-4 py-2 ring-1 dark:ring-offset-black dark:hover:ring-offset-2 ${colorClass} rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 ${className || ''}`}
    >
      {children}
    </button>
  )
}

export default Button
