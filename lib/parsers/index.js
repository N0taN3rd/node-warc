/**
 * @type {AutoWARCParser}
 */
exports.AutoWARCParser = require('./autoWARCParser')

/**
 * @type {GzipDetector}
 */
exports.GzipDetector = require('./gzipDetector')

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
exports.WARCStreamTransform = require('./warcStreamTransform')

if (require('./_canUseRecordIterator')) {
  /**
   * @type {function(warcStream: ReadStream|Gunzip): AsyncIterator<WARCRecord>}
   */
  exports.recordIterator = require('./recordterator')
}
