const { URL } = require('url')

/**
 * @desc Returns the properly formatted HTTP request path
 * @param {string|URL} url
 * @return {string}
 */
function httpRequestPath (url) {
  if (!(url instanceof URL)) {
    url = new URL(url)
  }
  return (
    `${url.pathname}${url.search ? `?${url.searchParams.toString()}` : ''}${url.hash ? url.hash : ''}`
  )
}

module.exports = {
  httpRequestPath
}
