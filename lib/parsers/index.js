exports.AutoWARCParser = require('./autoWARCParser')

exports.GzipDetector = require('./gzipDetector')

exports.WARCGzParser = require('./warcGzParser')

exports.WARCParser = require('./warcParser')

exports.WARCStreamTransform = require('./warcStreamTransform')

if (require('./_canUseRecordIterator')) {
  /**
   * @type {function(warcStream: ReadStream|Gunzip): AsyncIterator<WARCRecord>}
   */
  exports.recordIterator = require('./recordterator')
}
