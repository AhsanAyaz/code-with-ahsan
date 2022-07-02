import siteMetadata from '@/data/siteMetadata'
import { PageSEO } from '@/components/SEO'
import { useEffect } from 'react'
import { LINKS } from '../data/headerNavLinks'
import getQueryParams from '../lib/utils/queryParams'
import logAnalyticsEvent from '../lib/utils/logAnalyticsEvent'

export default function AngularCookbook() {
  useEffect(() => {
    if (window) {
      const { source } = getQueryParams()
      logAnalyticsEvent(
        source === 'nav' ? 'angular_cookbook_from_nav' : 'angular_cookbook_amazon_redirect'
      )
      window.location.href = LINKS.ANGULAR_COOKBOOK
    }
  }, [])
  return (
    <>
      <PageSEO
        title={`Angular Cookbook - ${siteMetadata.author}`}
        imageUrl={'https://m.media-amazon.com/images/P/B08VTWYJ7H.01._SCLZZZZZZZ_SX500_.jpg'}
        description={siteMetadata.description}
      />
    </>
  )
}
