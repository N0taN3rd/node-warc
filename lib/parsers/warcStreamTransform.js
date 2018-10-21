const { Transform } = require('stream')
const RecordBuilder = require('../warcRecord/builder')
const { crlf } = require('../warcRecord/fieldIdentifiers')

/**
 * @desc Transforms a WARC file ReadStream into its individual {@link WARCRecord}s
 * @extends {Transform}
 * @example
 *  fs.createReadStream('someWARC.warc')
 *    .pipe(new WARCStreamTransform())
 *    .on('data', record => { console.log(record); })
 * @example
 *  fs.createReadStream('someWARC.warc.gz')
 *    .pipe(zlib.createGunzip())
 *    .pipe(new WARCStreamTransform())
 *    .on('data', record => { console.log(record); })
 */
class WARCStreamTransform extends Transform {
  /**
   * @desc Create a new WARCStreamTransform
   */
  constructor () {
    super({
      readableObjectMode: true
    })
    /**
     * @type {?Buffer}
     */
    this.buffered = undefined

    /**
     * @type {RecordBuilder}
     */
    this.builder = new RecordBuilder()

    /**
     * @type {number}
     */
    this.sepLen = crlf.length
  }

  /**
   * @param {Buffer} chunk
   * @param {function} done
   * @param {boolean} [pushLast = false]
   * @private
   */
  _consumeChunk (chunk, done, pushLast = false) {
    let offset = 0
    let lastMatch = 0
    let idx
    let maybeRecord
    let chunkLen = chunk.length
    while (true) {
      idx = offset >= chunkLen ? -1 : chunk.indexOf(crlf, offset)
      if (idx !== -1 && idx < chunk.length) {
        maybeRecord = this.builder.consumeLine(
          chunk.slice(lastMatch, idx + this.sepLen)
        )
        if (maybeRecord != null) this.push(maybeRecord)
        offset = idx + this.sepLen
        lastMatch = offset
      } else {
        this.buffered = chunk.slice(lastMatch)
        if (pushLast) {
          maybeRecord = this.builder.consumeLine(this.buffered)
          if (maybeRecord) {
            this.push(maybeRecord)
          }
        }
        break
      }
    }
    done()
  }

  /**
   * @param {Buffer} buf
   * @param {string} enc
   * @param {function} done
   * @private
   */
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

  /**
   * @param {function} done
   * @private
   */
  _flush (done) {
    if (this.buffered) {
      this._consumeChunk(this.buffered, done, true)
    }
    done()
  }
}

/**
 * @type {WARCStreamTransform}
 */
module.exports = WARCStreamTransform
