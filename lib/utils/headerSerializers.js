const startCase = require('lodash.startcase')
const { SPACE, DASH } = require('../utils/constants')
const { CRLF } = require('../writers/warcFields')

/**
 * @param {string} headerKey
 * @return {string}
 */
function ensureHTTP2Headers (headerKey) {
  if (headerKey[0] === ':') return headerKey
  return startCase(headerKey)
    .split(SPACE)
    .join(DASH)
}

/**
 * @desc Converts an HTTP headers object into its string representation
 * @param {Object} headers - The HTTP header object to be stringified
 * @returns {string}
 */
exports.stringifyHeaders = function stringifyHeaders (headers) {
  const entries = Object.entries(headers)
  const len = entries.length
  let headKey, headValue
  let i = 0
  let outString = ''
  for (; i < len; ++i) {
    ;[headKey, headValue] = entries[i]
    outString += `${ensureHTTP2Headers(headKey)}: ${headValue}${CRLF}`
  }
  outString += CRLF
  return outString
}

/**
 * @desc Converts an HTTP request headers object into its string representation
 * @param {Object} reqHeaders - The HTTP headers object for the request
 * @param {string} host - The host for the request to be used if the HTTP headers object does not contain the Host field
 * @returns {string}
 */
exports.stringifyRequestHeaders = function stringifyRequestHeaders (
  reqHeaders,
  host
) {
  const headersEntries = Object.entries(reqHeaders)
  const len = headersEntries.length
  let hasHost = false
  let headerKey, headerValue
  let i = 0
  let headerString = ''
  for (; i < len; ++i) {
    ;[headerKey, headerValue] = headersEntries[i]
    if (headerKey === 'host') {
      hasHost = true
    }
    headerString += `${ensureHTTP2Headers(headerKey)}: ${headerValue}${CRLF}`
  }
  if (!hasHost) {
    return headerString + `Host: ${host}${CRLF}${CRLF}`
  }
  return headerString + CRLF
}
