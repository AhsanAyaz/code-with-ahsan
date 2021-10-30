import React from 'react'
import Image from 'next/image'
// import "./ImageWithBg.css"
// import { rhythm } from "../../utils/typography"

const ImageWithBg = ({
  src,
  backgroundColor = '#1E1E1E',
  alt = '',
  title = '',
  imageHeight,
  caption = '',
  textColor = 'black',
  id = null,
  noLink = false,
  objectFit = 'contain',
}) => {
  let linkId = null
  if (id) {
    linkId = id
  } else if (caption !== '') {
    linkId = caption.toLowerCase().replace(/ +/g, '-')
  }
  return (
    <div
      className="image-with-bg relative flex flex-col items-center"
      style={{
        height: imageHeight || 500,
        margin: '0 auto',
      }}
    >
      {noLink === false && linkId !== null ? <div id={linkId} /> : null}
      <div
        className="wrapper relative"
        style={{ height: imageHeight || 300, width: '100%', margin: '0 auto' }}
      >
        <Image
          src={src}
          alt={alt}
          title={title}
          layout="fill"
          objectFit="contain"
          className="my-1 px-2 relative overflow-hidden xl:my-1 xl:px-2 xl:w-1/2"
          style={{
            marginBottom: 0,
            marginLeft: 'auto',
            marginRight: 'auto',
            objectFit,
          }}
        />
      </div>
      {caption ? (
        <div
          className="img-caption"
          style={{
            color: textColor,
          }}
        >
          {caption}
        </div>
      ) : null}
    </div>
  )
}

export default ImageWithBg
