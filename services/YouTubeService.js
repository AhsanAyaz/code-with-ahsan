export const getEmbedUrl = (originalUrl) => {
  if (!originalUrl) {
    return
  }
  let vidUrl = ''
  let videoParams = ''
  let isYouTube = false
  let vidId = ''
  let ts = 0
  try {
    if (originalUrl.includes('youtube') || originalUrl.includes('youtu.be')) {
      isYouTube = true
      vidUrl = `https://www.youtube.com/embed/`
      videoParams = originalUrl.includes('youtube')
        ? originalUrl.split('watch?v=')[1]
        : originalUrl.split('youtu.be/')[1]

      if (videoParams.includes('&')) {
        const [videoId, ...segments] = videoParams.split('&')
        videoParams = videoId
        vidId = videoId
        segments.forEach((segment) => {
          const [key, val] = segment.split('=')
          if (key === 't') {
            const time = val.replace('s', '')
            ts = Number(time) || 1
            videoParams += `?start=${ts}`
          }
        })
      } else {
        vidId = videoParams
      }
      vidUrl += `${videoParams}${videoParams.includes('?') ? `&` : '?'}autoplay=1`
      vidUrl = addYouTubeExtraParams(vidUrl)
    } else {
      vidUrl = originalUrl
    }
    return {
      url: vidUrl,
      isYouTube,
      id: vidId,
      ts,
    }
  } catch (e) {
    console.log(e, this)
  }
}

const addYouTubeExtraParams = (videoUrl) => {
  return videoUrl + `${!videoUrl.includes('?') ? '?' : '&'}&enablejsapi=1&rel=0`
}

export const getYouTubeComments = async (videoId) => {
  const { google } = await import('googleapis')
  const youtube = google.youtube({
    version: 'v3',
    auth: process.env['YT_API_KEY'],
  })
  const commentsProm = await youtube.commentThreads.list({
    videoId,
    part: 'snippet',
    maxResults: 100,
    order: 'time',
  })
  return commentsProm.data.items
    .map((item) => {
      return item.snippet
    })
    .filter((comment) => {
      const exclusions = ['0:0', 'timeline']
      return !exclusions.some((excl) =>
        comment.topLevelComment.snippet.textDisplay.toLowerCase().includes(excl)
      )
    })
}
