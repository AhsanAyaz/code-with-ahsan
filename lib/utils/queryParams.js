const getQueryParams = () =>
  new Proxy(new URLSearchParams(window.location.search), {
    get: (searchParams, prop) => searchParams.get(prop),
  })

export const getFireStorageFileName = (url) => {
  const fileName = url.split('/').at(-1).split('?')[0]
  return decodeURIComponent(fileName)
}

export default getQueryParams
