'use strict'
const WARCStreamTransform = require('./warcStreamTransform')

/**
 * @desc Creates async iterator that yields {@link WARCRecord}s given a readable stream of a WARC file
 * @param {ReadStream|Gunzip} warcStream
 * @returns {AsyncIterator<WARCRecord>}
 */
module.exports = function recordIterator (warcStream) {
  const recordStream = warcStream.pipe(new WARCStreamTransform())
  return recordStream[Symbol.asyncIterator]()
}
