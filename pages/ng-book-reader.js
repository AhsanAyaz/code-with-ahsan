import { useEffect } from 'react'
import SimpleLayout from '../layouts/SimpleLayout'
import logAnalyticsEvent from '../lib/utils/logAnalyticsEvent'
import getQueryParams from '../lib/utils/queryParams'

export default function AngularCookbookReader() {
  useEffect(() => {
    if (window) {
      const { chapter } = getQueryParams()
      const event = 'angular_cookbook_app_info'
      logAnalyticsEvent(event, {
        chapter: chapter || '',
      })
    }
  }, [])
  return (
    <SimpleLayout
      seoTitle={`Angular Cookbook - Thank You`}
      title={'Thank you!'}
      description={
        'Thank you for getting a copy of the Angular Cookbook. One of the best books out there to grow your Angular skills for enterprise applications development'
      }
      SideBarContent={() => (
        <aside>
          <img
            src="https://m.media-amazon.com/images/P/1838989439.01._SCLZZZZZZZ_SX500_.jpg"
            className="object-contain h-72 md:h-full"
          ></img>
        </aside>
      )}
    >
      <section className="flex flex-col gap-4">
        <h4>
          "Thank you for getting a copy of the{' '}
          <a href="https://codewithahsan.dev/ng-book">Angular Cookbook</a>!"
        </h4>
        <p className="my-2">
          If you found the book useful, do consider giving it a review{' '}
          <span role="img" aria-labelledby="star">
            🌟
          </span>{' '}
          on <a href="https://codewithahsan.dev/ng-book">Amazon</a>
        </p>
        <p className="my-2">
          Feel free to check out more angular projects on my{' '}
          <a href="https://github.com/ahsanayaz">GitHub</a> (leave a follow if you like) and check
          out my <a href="https://youtube.com/codewithahsan">YouTube</a> channel for more amazing
          Angular content.{' '}
        </p>
      </section>
    </SimpleLayout>
  )
}
