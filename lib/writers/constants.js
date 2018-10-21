/**
 * @desc Regex for removing the content encoding HTTP header
 * @type {RegExp}
 */
const noGZ = /Content-Encoding.*(?:gzip|br|deflate)\r\n/gi

/**
 * @type {RegExp}
 */
exports.noGZ = noGZ

/**
 * @desc Regex for rewriting the content length HTTP header
 * @type {RegExp}
 */
const replaceContentLen = /Content-Length:.*\r\n/gi

/**
 * @type {RegExp}
 */
exports.replaceContentLen = replaceContentLen
