export const getEmbedUrl = (originalUrl) => {
  if (!originalUrl) {
    return
  }
  let vidUrl = ''
  let videoParams = ''
  try {
    if (originalUrl.includes('youtube') || originalUrl.includes('youtu.be')) {
      vidUrl = `https://www.youtube.com/embed/`
      videoParams = originalUrl.includes('youtube')
        ? originalUrl.split('watch?v=')[1]
        : originalUrl.split('youtu.be/')[1]

      if (videoParams.includes('&')) {
        const [videoId, ...segments] = videoParams.split('&')
        videoParams = videoId
        segments.forEach((segment) => {
          const [key, val] = segment.split('=')
          if (key === 't') {
            const time = val.replace('s', '')
            videoParams += `?start=${Number(time) || 1}`
          }
        })
      }
      vidUrl += `${videoParams}${videoParams.includes('?') ? `&` : '?'}autoplay=1`
    }
    return vidUrl
  } catch (e) {
    console.log(e, this)
  }
}
