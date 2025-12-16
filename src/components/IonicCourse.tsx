import React from 'react'
import PromotionBanner from './PromotionBanner'
const IonicCourse = () => {
  return (
    <PromotionBanner>
      <div className="ionic-course">
        <span role="img" aria-label="loudspeaker emoji">
          📢
        </span>{' '}
        &nbsp; The course &nbsp;
        <a href="https://www.udemy.com/course/hands-on-app-development-with-ionic/">
          Hands-On App Development with Ionic
        </a>{' '}
        &nbsp; on Udemy is on a <b>89%</b> sale right now at <b>€12.99</b>{' '}
        <span role="img" aria-label="money emoji">
          💰
        </span>
        <span role="img" aria-label="money emoji">
          💰
        </span>
        . And if you hurry, I have <b>TEN LIMITED DISCOUNT COUPONS</b> for the first 10 folks who
        reach out to any of my socials for them.
      </div>
    </PromotionBanner>
  )
}

export default IonicCourse
