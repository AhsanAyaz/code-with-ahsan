import React, { useState, useEffect, useCallback } from 'react'
import { useTheme } from 'next-themes'

import siteMetadata from '@/data/siteMetadata'

const Utterances = ({ issueTerm }) => {
  const metaData = siteMetadata.default || siteMetadata
  const [enableLoadComments, setEnabledLoadComments] = useState(false)
  const { theme, resolvedTheme } = useTheme()
  const commentsTheme =
    theme === 'dark' || resolvedTheme === 'dark'
      ? metaData.comment.utterancesConfig.darkTheme
      : metaData.comment.utterancesConfig.theme

  const COMMENTS_ID = 'comments-container'

  const loadComments = useCallback(() => {
    setEnabledLoadComments(false)
    const script = document.createElement('script')
    script.src = 'https://utteranc.es/client.js'
    script.setAttribute('repo', metaData.comment.utterancesConfig.repo)
    script.setAttribute('issue-term', issueTerm)
    script.setAttribute('label', metaData.comment.utterancesConfig.label)
    script.setAttribute('theme', commentsTheme)
    script.setAttribute('crossorigin', 'anonymous')
    script.async = true

    const comments = document.getElementById(COMMENTS_ID)
    if (comments) comments.appendChild(script)

    return () => {
      const comments = document.getElementById(COMMENTS_ID)
      if (comments) comments.innerHTML = ''
    }
  }, [commentsTheme, issueTerm])

  // Reload on theme change
  useEffect(() => {
    const iframe = document.querySelector(`.utterances`)
    if (!iframe) {
      return
    }
    const iframes = document.querySelectorAll('.utterances')
    iframes.forEach((iframe) => iframe.remove())
    loadComments()
  }, [loadComments])

  useEffect(() => {
    loadComments()
  }, [])

  // Added `relative` to fix a weird bug with `utterances-frame` position
  return (
    <div className="pt-6 pb-6 text-center text-gray-700 dark:text-gray-300">
      {enableLoadComments && <button onClick={loadComments}>Load Comments</button>}
      <div className="relative utterances-frame" id={COMMENTS_ID} />
    </div>
  )
}

export default Utterances
