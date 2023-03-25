import React from 'react'

const PrimaryLink = ({ href, children }) => {
  return (
    <a
      href={href}
      className="text-primary-500 dark:text-primary-300"
      rel="noopener noreferrer"
      target={'_blank'}
    >
      {children}
    </a>
  )
}

export default PrimaryLink
