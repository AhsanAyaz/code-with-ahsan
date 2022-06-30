import { getApp } from 'firebase/app'
import { getAnalytics, logEvent } from 'firebase/analytics'

let analytics
if (process?.title === 'browser') {
  analytics = getAnalytics(getApp())
}

const logAnalyticsEvent = (eventName, eventParams = {}) => {
  if (!window || !eventName) return
  logEvent(analytics, eventName, eventParams)
}

export default logAnalyticsEvent
