const { Transform } = require('stream')
const RecordBuilder = require('../warcRecord/builder')
const { crlf } = require('../warcRecord/fieldIdentifiers')

const sepLen = crlf.length

/**
 *
 */
class WARCStreamTransform extends Transform {
  constructor () {
    super({
      readableObjectMode: true
    })
    this.buffered = undefined
    this.builder = new RecordBuilder()
  }

  _consumeChunk (chunk, done) {
    let offset = 0
    let lastMatch = 0
    let idx
    let maybeRecord
    let chunkLen = chunk.length
    while (true) {
      idx = offset >= chunkLen ? -1 : chunk.indexOf(crlf, offset)
      if (idx !== -1 && idx < chunk.length) {
        maybeRecord = this.builder.consumeLine(
          chunk.slice(lastMatch, idx + sepLen)
        )
        if (maybeRecord != null) this.push(maybeRecord)
        offset = idx + sepLen
        lastMatch = offset
      } else {
        this.buffered = chunk.slice(lastMatch)
        break
      }
    }
    done()
  }

  _transform (buf, enc, done) {
    let chunk
    if (this.buffered) {
      chunk = Buffer.concat(
        [this.buffered, buf],
        this.buffered.length + buf.length
      )
      this.buffered = undefined
    } else {
      chunk = buf
    }
    this._consumeChunk(chunk, done)
  }

  _flush (done) {
    if (this.buffered) {
      this._consumeChunk(this.buffered, done)
    }
    done()
  }
}

/**
 * @type {WARCStreamTransform}
 */
module.exports = WARCStreamTransform
