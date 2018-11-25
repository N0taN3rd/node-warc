/**
 * @type {{AutoWARCParser: AutoWARCParser, WARCGzParser: WARCGzParser, WARCParser: WARCParser, WARCStreamTransform: WARCStreamTransform, GzipDetector: GzipDetector}}
 */
module.exports = {
  AutoWARCParser: require('./autoWARCParser'),
  WARCGzParser: require('./warcGzParser'),
  WARCParser: require('./warcParser'),
  WARCStreamTransform: require('./warcStreamTransform'),
  GzipDetector: require('./gzipDetector')
}

if (require('./_canUseRecordIterator')) {
  /**
   * @type {function(warcStream: ReadStream|Gunzip): AsyncIterator<WARCRecord>}
   */
  module.exports.recordIterator = require('./recordterator')
}
