import React from 'react'

const EmbeddedYouTubeVideo = ({
  src,
  title = 'Youtube video player',
  id = null,
  width = 560,
  height = 315,
  allowfullscreen = true,
}) => {
  return (
    <div className="embedded-yt-video mb-1.5">
      <iframe
        id={id || src}
        width={width}
        height={height}
        src={src}
        title={title}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen={allowfullscreen}
      ></iframe>
    </div>
  )
}

export default EmbeddedYouTubeVideo
