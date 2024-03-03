import LiteYouTubeEmbed from 'react-lite-youtube-embed'
import 'react-lite-youtube-embed/dist/LiteYouTubeEmbed.css'
import { useRef } from 'react'

let player
let loadYtIframeAPI

const YoutubePlayer = ({ videoId, title, thumbnail, timestamp }) => {
  const videoRef = useRef(null)

  const loadYtPlayer = () => {
    if (!loadYtIframeAPI) {
      loadYtIframeAPI = new Promise((resolve) => {
        const tag = document.createElement('script')
        tag.src = 'https://www.youtube.com/iframe_api'
        const firstScriptTag = document.getElementsByTagName('script')[0]
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)
        window.onYouTubeIframeAPIReady = () => resolve(window.YT)
      })
    }

    if (videoRef?.current) {
      loadYtIframeAPI.then((YT) => {
        player = new YT.Player(videoRef.current, {
          events: {
            onReady: onPlayerReady,
            onStateChange: onPlayerStateChange,
          },
        })
      })
    }
  }

  const onPlayerReady = () => {
    setTimeout(() => {
      player.seekTo(timestamp, true)
    }, 500)
  }

  const onPlayerStateChange = (newState) => {
    if (newState.data == 1) {
      console.log('Video Playing')
    } else if (newState.data == 0) {
      console.log('Video Finished')
    } else if (newState.data == 2) {
      console.log('Video Paused', Math.round(player.getCurrentTime()))
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
          params={`enablejsapi=1&autoplay=1&rel=0&start=${timestamp}`}
          onIframeAdded={loadYtPlayer}
        />
      </div>
    )
  } else {
    return null
  }
}

export default YoutubePlayer
