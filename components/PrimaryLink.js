import React from 'react'

const PrimaryLink = ({ href, children }) => {
  return (
    <a
      href={href}
      className="text-primary-500 hover:underline"
      rel="noopener noreferrer"
      target={'_blank'}
    >
      {children}
    </a>
  )
}

export default PrimaryLink
