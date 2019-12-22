const startCase = require('lodash/startCase')
const { DASH } = require('../utils/constants')
const { CRLF } = require('../writers/warcFields')

/**
 * @type {RegExp}
 */
const SPACERe = /\s/g

/**
 * @param {string} headerKey
 * @return {string}
 */
function ensureHTTP2Headers (headerKey) {
  if (headerKey[0] === ':') return headerKey
  return startCase(headerKey).replace(SPACERe, DASH)
}

/**
 * Converts an HTTP headers object into its string representation
 * @param {Object} headers - The HTTP header object to be stringified
 * @returns {string}
 */
exports.stringifyHeaders = function stringifyHeaders (headers) {
  let headerKey
  const outString = []
  for (headerKey in headers) {
    outString.push(
      `${ensureHTTP2Headers(headerKey)}: ${headers[headerKey]}${CRLF}`
    )
  }
  // join used to fix memory issue caused by concatenation: https://bugs.chromium.org/p/v8/issues/detail?id=3175#c4
  // affects node
  return outString.join('')
}

/**
 * Converts an HTTP request headers object into its string representation
 * @param {Object} headers - The HTTP headers object for the request
 * @param {string} host - The host for the request to be used if the HTTP headers object does not contain the Host field
 * @returns {string}
 */
exports.stringifyRequestHeaders = function stringifyRequestHeaders (
  headers,
  host
) {
  let hasHost = false
  let headerKey
  const outString = []
  for (headerKey in headers) {
    if (headerKey === 'host' || headerKey === 'Host') {
      hasHost = true
    }
    outString.push(
      `${ensureHTTP2Headers(headerKey)}: ${headers[headerKey]}${CRLF}`
    )
  }
  if (!hasHost) {
    outString.push(`Host: ${host}${CRLF}`)
  }
  // join used to fix memory issue caused by concatenation: https://bugs.chromium.org/p/v8/issues/detail?id=3175#c4
  // affects node
  return outString.join('')
}
