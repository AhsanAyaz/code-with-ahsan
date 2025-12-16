import LiteYouTubeEmbed from 'react-lite-youtube-embed'
import 'react-lite-youtube-embed/dist/LiteYouTubeEmbed.css'
import { useRef, useEffect, useState, useCallback } from 'react'

let loadYtIframeAPI

const YoutubePlayer = ({ videoId, title, thumbnail, timestamp }) => {
  const videoRef = useRef(null)
  const [player, setPlayer] = useState(null)
  const [currentVideoId, setCurrentVideoId] = useState(videoId)

  useEffect(() => {
    if (!loadYtIframeAPI) {
      loadYtIframeAPI = new Promise((resolve) => {
        const tag = document.createElement('script')
        tag.src = 'https://www.youtube.com/iframe_api'
        const firstScriptTag = document.getElementsByTagName('script')[0]
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)
        window.onYouTubeIframeAPIReady = () => resolve(window.YT)
      })
    }

    return () => {
      if (player && player.destroy) {
        player.destroy()
      }
    }
  }, [player])

  useEffect(() => {
    if (player && player.loadVideoById && videoId !== currentVideoId) {
      // VideoId has changed, load new video
      setCurrentVideoId(videoId)
      player.loadVideoById({
        videoId: videoId,
        startSeconds: parseInt(timestamp, 10),
      })
    } else if (player && player.seekTo) {
      // Only timestamp has changed, seek to new timestamp
      player.seekTo(parseInt(timestamp, 10))
    }
  }, [videoId, timestamp, player, currentVideoId])

  const loadYtPlayer = useCallback(() => {
    if (videoRef?.current) {
      loadYtIframeAPI.then((YT) => {
        const newPlayer = new YT.Player(videoRef.current, {
          videoId: videoId,
          playerVars: {
            autoplay: 1,
            controls: 1,
            start: parseInt(timestamp, 10),
          },
          events: {
            onReady: onPlayerReady,
            onStateChange: onPlayerStateChange,
          },
        })
        setPlayer(newPlayer)
      })
    }
  }, [videoId, timestamp])

  const onPlayerReady = (event) => {
    setPlayer(event.target)
    event.target.seekTo(parseInt(timestamp, 10))
    event.target.playVideo()
  }

  const onPlayerStateChange = (event) => {
    const YT = window.YT
    if (YT) {
      if (event.data === YT.PlayerState.PLAYING) {
        console.log('Video Playing')
      } else if (event.data === YT.PlayerState.ENDED) {
        console.log('Video Finished')
      } else if (event.data === YT.PlayerState.PAUSED) {
        console.log('Video Paused', Math.round(event.target.getCurrentTime()))
      }
    }
  }

  if (videoId) {
    return (
      <div className="aspect-video">
        <LiteYouTubeEmbed
          ref={videoRef}
          wrapperClass="yt-lite rounded-md"
          id={videoId}
          title={title}
          thumbnail={thumbnail}
          params={`enablejsapi=1&autoplay=1&rel=0`}
          onIframeAdded={loadYtPlayer}
        />
      </div>
    )
  } else {
    return null
  }
}

export default YoutubePlayer
