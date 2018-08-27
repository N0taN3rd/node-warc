const startCase = require('lodash.startcase')
/** @ignore */
const { SPACE, DASH } = require('../utils/constants')
const { CRLF } = require('../writers/warcFields')

/**
 * @param {Object} headers
 * @returns {string}
 */
function stringifyHeaders (headers) {
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
 *
 * @param {Object} reqHeaders
 * @param {string} host
 * @returns {string}
 */
function stringifyRequestHeaders (reqHeaders, host) {
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

module.exports = {
  stringifyHeaders,
  stringifyRequestHeaders
}
