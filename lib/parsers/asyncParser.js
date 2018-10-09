const WARCStreamTransform = require('./streamTransform')

/**
 * @param {Readable | Transform | ReadStream | Gunzip} warcStream
 * @returns {AsyncIterator<WARCRecord>}
 */
async function * warcRecordIterator (warcStream) {
  const recordStream = warcStream.pipe(new WARCStreamTransform())
  const recordIterator = recordStream[Symbol.asyncIterator]()
  let nextRecord
  while (true) {
    nextRecord = await recordIterator.next()
    if (nextRecord.done) break
    yield nextRecord.value
  }
}

/**
 * @type {warcRecordIterator}
 */
module.exports = warcRecordIterator
