'use strict'
const WARCStreamTransform = require('./warcStreamTransform')

/**
 * @desc Creates async iterator that yields {@link WARCRecord}s given a readable stream of a WARC file
 * @param {ReadStream|Gunzip} warcStream
 * @returns {AsyncIterator<WARCRecord>}
 */
module.exports = async function * recordIterator (warcStream) {
  const recordStream = warcStream.pipe(new WARCStreamTransform())
  const recordIterator = recordStream[Symbol.asyncIterator]()
  let nextRecord
  while (true) {
    nextRecord = await recordIterator.next()
    if (nextRecord.done) break
    yield nextRecord.value
  }
}
