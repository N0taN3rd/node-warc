/**
 * @desc Regex for removing the content encoding HTTP header
 * @type {RegExp}
 */
const noGZ = /Content-Encoding.*(?:gzip|br|deflate)\r\n/gi

/**
 * @desc Regex for rewriting the content length HTTP header
 * @type {RegExp}
 */
const replaceContentLen = /Content-Length:.*\r\n/gi

/**
 * @type {{noGZ: RegExp, replaceContentLen: RegExp}}
 */
module.exports = {
  noGZ,
  replaceContentLen
}
