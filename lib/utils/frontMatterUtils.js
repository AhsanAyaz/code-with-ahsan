import siteMetadata from '../../data/siteMetadata'

export const getFeaturedImages = (images, siteMetadata) => {
  let imagesArr =
    images.length === 0
      ? [siteMetadata.socialBanner]
      : typeof images === 'string'
      ? [images]
      : images

  const featuredImages = imagesArr.map((img) => {
    return {
      '@type': 'ImageObject',
      url: `${siteMetadata.siteUrl}${img}`,
    }
  })

  return featuredImages
}

export const getPostCoverImageUrl = (images, siteMetadata) => {
  let imagesArr = images?.length === 0 ? [''] : typeof images === 'string' ? [images] : images
  return imagesArr?.[0]
}
