'use strict'
const WARCStreamTransform = require('./warcStreamTransform')

/**
 * Creates async iterator that yields {@link WARCRecord}s given a readable stream of a WARC file
 * @param {ReadStream|Gunzip} warcStream
 * @returns {AsyncIterator<WARCRecord>}
 */
module.exports = function recordIterator (warcStream) {
  return warcStream.pipe(new WARCStreamTransform())[Symbol.asyncIterator]()
}
