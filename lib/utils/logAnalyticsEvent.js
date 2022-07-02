import { getApp } from 'firebase/app'
import { getAnalytics, logEvent } from 'firebase/analytics'

let analytics
if (process?.title === 'browser') {
  analytics = getAnalytics(getApp())
}

const logAnalyticsEvent = (eventName, eventParams = {}) => {
  if (!window || !eventName || process.env.NEXT_PUBLIC_NODE_ENV === 'development') {
    console.log('dev logAnalyics. Not sending to firebase', {
      eventName,
      eventParams,
      env: process.env,
    })
    return
  }
  logEvent(analytics, eventName, eventParams)
}

export default logAnalyticsEvent
