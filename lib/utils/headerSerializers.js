const startCase = require('lodash.startcase')
const { SPACE, DASH } = require('../utils/constants')
const { CRLF } = require('../writers/warcFields')

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
  while (i < len) {
    ;[headKey, headValue] = entries[i]
    outString += `${startCase(headKey)
      .split(SPACE)
      .join(DASH)}: ${headValue}${CRLF}`
    i += 1
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
exports.stringifyRequestHeaders = function stringifyRequestHeaders (reqHeaders, host) {
  const headersEntries = Object.entries(reqHeaders)
  const len = headersEntries.length
  let hasHost = false
  let headerKey, headerValue
  let i = 0
  let headerString = ''
  while (i < len) {
    ;[headerKey, headerValue] = headersEntries[i]
    if (headerKey === 'host') {
      hasHost = true
    }
    headerString += `${startCase(headerKey)
      .split(SPACE)
      .join(DASH)}: ${headerValue}${CRLF}`
    i += 1
  }
  if (!hasHost) {
    headerString += `Host: ${host}${CRLF}${CRLF}`
  } else {
    headerString += CRLF
  }
  return headerString
}
