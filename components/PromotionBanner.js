import React from 'react'
const PromotionBanner = ({
  title = 'Shameless Plug: (YOU can support Ahsan) <span>❤️</span>',
  children,
}) => {
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
