const untildify = require('untildify')
const fs = require('fs-extra')
const zlib = require('zlib')
const EventEmitter = require('eventemitter3')
const WARCStreamTransform = require('./warcStreamTransform')
const canUseRecordIterator = require('./_canUseRecordIterator')

/**
 * Parse a WARC.gz file
 * @extends {EventEmitter}
 * @example
 *  const parser = new WARCGzParser('<path-to-warcfile>')
 *  parser.on('record', record => { console.log(record); })
 *  parser.on('done', () => { console.log('finished'); })
 *  parser.on('error', error => { console.error(error); })
 *  parser.start()
 * @example
 *  const parser = new WARCGzParser()
 *  parser.on('record', record => { console.log(record); })
 *  parser.on('done', () => { console.log('finished'); })
 *  parser.on('error', error => { console.error(error); })
 *  parser.parseWARC('<path-to-warcfile>')
 * @example
 *  // requires node >= 10
 *  for await (const record of new WARCGzParser('<path-to-warcfile>')) {
 *    console.log(record)
 *  }
 */
class WARCGzParser extends EventEmitter {
  /**
   * Create a new WARCGzParser
   * @param {?string} [wp] - path to the warc.gz file to be parsed
   */
  constructor (wp) {
    super()
    /**
     * @type {?string} the path to the WARC.gz file to be parsed
     * @private
     */
    this._wp = wp

    /**
     * @type {boolean} is the parser currently parsing the WARC.gz
     * @private
     */
    this._parsing = false
    this._onRecord = this._onRecord.bind(this)
    this._onError = this._onError.bind(this)
    this._onEnd = this._onEnd.bind(this)
    if (canUseRecordIterator) {
      const recordIterator = require('./recordterator')
      /**
       * @returns {AsyncIterator<WARCRecord>}
       */
      this[Symbol.asyncIterator] = () => {
        return recordIterator(
          fs.createReadStream(this._wp).pipe(zlib.createGunzip())
        )
      }
    }
  }

  /**
   * Begin parsing the WARC.gz file. Once the start method has been called the parser will begin emitting
   * @emits {record} emitted when the parser has parsed a full record, the argument supplied to the listener will be the parsed record
   * @emits {done} emitted when the WARC.gz file has been completely parsed, the argument supplied to the listener will be last record
   * @emits {error} emitted if an exception occurs, the argument supplied to the listener will be the error that occurred.
   * @return {boolean} indication if the parser has begun or is currently parsing a WARC.gz file
   * - true: indicates the parser has begun parsing the WARC.gz file true
   * - false: indicated the parser is currently parsing a WARC.gz file
   * @throws {Error} if the path to the WARC.gz file is null or undefined or another error occurred
   */
  start () {
    let start = false
    if (!this._parsing) {
      if (this._wp == null) {
        throw new Error('The path to the WARC file is null/undefined')
      }
      this._parsing = true
      start = true
      fs.createReadStream(untildify(this._wp))
        .pipe(zlib.createGunzip())
        .pipe(new WARCStreamTransform())
        .on('data', this._onRecord)
        .on('error', this._onError)
        .on('end', this._onEnd)
    }
    return start
  }

  /**
   * Callback for the read stream data event
   * @param {WARCRecord} record
   * @private
   */
  _onRecord (record) {
    this.emit('record', record)
  }

  /**
   * Callback for the read stream error event
   * @param {Error} error
   * @private
   */
  _onError (error) {
    this.emit('error', error)
  }

  /**
   * Callback for the read stream end event
   * @private
   */
  _onEnd () {
    this._parsing = false
    this.emit('done')
  }

  /**
   * Alias for {@link start} except that you can supply the path to the WARC.gz file to be parsed
   * if one was not supplied via the constructor or to parse another WARC.gz file. If the path to WARC.gz file
   * to be parsed was supplied via the constructor and you supply a different path to this method.
   * It will override the one supplied via the constructor
   * @param {?string} [wp] - path to the WARC file to be parsed
   * @return {boolean} indication if the parser has begun or is currently parsing a WARC.gz file
   * @throws {Error} if the path to the WARC.gz file is null or undefined or another error occurred
   */
  parseWARC (wp) {
    if (!this._parsing) {
      this._wp = wp || this._wp
    }
    return this.start()
  }
}

module.exports = WARCGzParser
