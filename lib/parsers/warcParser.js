const untildify = require('untildify')
const fs = require('fs-extra')
const EventEmitter = require('eventemitter3')
const WARCStreamTransform = require('./warcStreamTransform')
const canUseRecordIterator = require('./_canUseRecordIterator')

/**
 * Parse a WARC file
 * @extends {EventEmitter}
 * @example
 *  const parser = new WARCParser('<path-to-warcfile>')
 *  parser.on('record', record => { console.log(record) })
 *  parser.on('done', () => { console.log('done') })
 *  parser.on('error', error => { console.error(error) })
 *  parser.start()
 * @example
 *  const parser = new WARCParser()
 *  parser.on('record', record => { console.log(record) })
 *  parser.on('done', () => { console.log('done') })
 *  parser.on('error', error => { console.error(error) })
 *  parser.parseWARC('<path-to-warcfile>')
 * @example
 *  // requires node >= 10
 *  for await (const record of new WARCParser('<path-to-warcfile>')) {
 *    console.log(record)
 *  }
 */
class WARCParser extends EventEmitter {
  /**
   * Create a new WARCParser
   * @param {?string} [wp] - path to the warc file to be parsed
   */
  constructor (wp) {
    super()
    /**
     * @type {?string} the path to the WARC file to be parsed
     * @private
     */
    this._wp = wp

    /**
     * @type {boolean} is the parser currently parsing the WARC
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
        return recordIterator(fs.createReadStream(this._wp))
      }
    }
  }

  /**
   * Begin parsing the WARC file. Once the start method has been called the parser will begin emitting
   * @emits {record} emitted when the parser has parsed a full record, the argument supplied to the listener will be the parsed record
   * @emits {done} emitted when the WARC file has been completely parsed, the argument supplied to the listener will be last record
   * @emits {error} emitted if an exception occurs, the argument supplied to the listener will be the error that occurred.
   * @return {boolean} indication if the parser has begun or is currently parsing a WARC file
   * - true: indicates the parser has begun parsing the WARC file true
   * - false: indicated the parser is currently parsing a WARC file
   * @throws {Error} if the path to the WARC file is null or undefined or another error occurred
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
   * Alias for {@link start} except that you can supply the path to the WARC file to be parsed
   * if one was not supplied via the constructor or to parse another WARC file. If the path to WARC file
   * to be parsed was supplied via the constructor and you supply a different path to this method.
   * It will override the one supplied via the constructor
   * @param {?string} [wp] - path to the WARC file to be parsed
   * @return {boolean} indication if the parser has begun or is currently parsing a WARC file
   * @throws {Error} if the path to the WARC file is null or undefined or another error occurred
   */
  parseWARC (wp) {
    if (!this._parsing) {
      this._wp = wp || this._wp
    }
    return this.start()
  }
}

module.exports = WARCParser
