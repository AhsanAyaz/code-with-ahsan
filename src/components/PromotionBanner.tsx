import React, { ReactNode } from 'react'

interface PromotionBannerProps {
  title?: string
  children?: ReactNode
}

const PromotionBanner = ({
  title = 'Shameless Plug: (YOU can support Ahsan) <span>❤️</span>',
  children,
}: PromotionBannerProps) => {
  return (
    <div className="promotion-banner">
      <small
        dangerouslySetInnerHTML={{
          __html: title,
        }}
      ></small>
      {children && children}
    </div>
  )
}

export default PromotionBanner
