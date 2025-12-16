const YouTubeComment = ({ comment, videoLink }) => {
  const { authorDisplayName, authorProfileImageUrl, textDisplay, likeCount, publishedAt } =
    comment.topLevelComment.snippet

  return (
    <div
      onClick={() => window.open(videoLink, '_blank')}
      className="flex space-x-2 p-4 items-start text-base-content break-words gap-4 justify-between px-4 py-2 backdrop-blur border border-primary-500/20 dark:border-primary-500/30 hover:border-primary-500/40 dark:hover:border-primary-500/50 transition-colors rounded-lg shadow-lg cursor-pointer"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') window.open(videoLink, '_blank')
      }}
    >
      <img src={authorProfileImageUrl} alt={authorDisplayName} className="w-10 h-10 rounded-full" />
      <div className="flex-1">
        <a
          href={`https://youtube.com/${authorDisplayName}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-primary-500 max-w-fit block"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-sm font-semibold">{authorDisplayName}</h3>
        </a>
        <a
          href={`https://youtube.com/${authorDisplayName}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-xs text-gray-500">{new Date(publishedAt).toLocaleDateString()}</p>
        </a>
        <div
          dangerouslySetInnerHTML={{ __html: textDisplay }}
          className="mt-2 text-sm text-base-content/80"
        ></div>
        <div className="flex items-center mt-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-gray-500 mr-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14 5l7 7m0 0l-7 7m7-7H3"
            />
          </svg>
          <span className="text-xs text-gray-500">{likeCount} likes</span>
        </div>
      </div>
    </div>
  )
}

export default YouTubeComment
