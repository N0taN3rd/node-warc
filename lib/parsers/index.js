/**
 * @type {AutoWARCParser}
 */
exports.AutoWARCParser = require('./autoWARCParser')

/**
 * @type {WARCGzParser}
 */
exports.WARCGzParser = require('./warcGzParser')

/**
 * @type {WARCParser}
 */
exports.WARCParser = require('./warcParser')

/**
 * @type {WARCStreamTransform}
 */
exports.WARCStreamTransform = require('./streamTransform')

/**
 * @type {GzipDetector}
 */
exports.GzipDetector = require('./gzipDetector')
