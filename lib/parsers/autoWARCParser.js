const fs = require('fs-extra')
const zlib = require('zlib')
const EventEmitter = require('eventemitter3')
const untildify = require('untildify')
const WARCStreamTransform = require('./warcStreamTransform')
const GzipDetector = require('./gzipDetector')
const canUseRecordIterator = require('./_canUseRecordIterator')

/**
 * @desc Parses a WARC file automatically detecting if it is gzipped.
 * @extends {EventEmitter}
 * @example
 *  const parser = new AutoWARCParser('<path-to-warcfile>')
 *  parser.on('record', record => { console.log(record) })
 *  parser.on('error', error => { console.error(error) })
 *  parser.start()
 * @example
 *  const parser = new AutoWARCParser()
 *  parser.on('record', record => { console.log(record) })
 *  parser.on('error', error => { console.error(error) })
 *  parser.parseWARC('<path-to-warcfile>')
 *  @example
 *  // requires node >= 10
 *  for await (const record of new AutoWARCParser('<path-to-warcfile>')) {
 *    console.log(record)
 *  }
 */
class AutoWARCParser extends EventEmitter {
  /**
   * @desc Create a new AutoWARCParser
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
    this._onEnd = this._onEnd.bind(this)
    this._onError = this._onError.bind(this)

    if (canUseRecordIterator) {
      const recordIterator = require('./recordterator')
      /**
       * @returns {AsyncIterator<WARCRecord>}
       */
      this[Symbol.asyncIterator] = () => {
        return recordIterator(this._getStream())
      }
    }
  }

  /**
   * @desc Begin parsing the WARC file. Once the start method has been called the parser will begin emitting
   * @emits {record} emitted when the parser has parsed a full record, the argument supplied to the listener will be the parsed record
   * @emits {done} emitted when the WARC file has been completely parsed
   * @emits {error} emitted if an exception occurs, the argument supplied to the listener will be the error that occurred.
   * @return {boolean}  if the parser has begun or is currently parsing a WARC file
   * - true: indicates the parser has begun parsing the WARC file true
   * - false: indicated the parser is currently parsing a WARC file
   * @throws {Error} if the path to the WARC file is null or undefined or another error occurred
   */
  start () {
    let startedParsing = false
    if (!this._parsing) {
      if (this._wp == null) {
        throw new Error('The supplied path to the WARC file is null/undefined')
      }
      this._parsing = true
      this._getStream()
        .pipe(new WARCStreamTransform())
        .on('data', this._onRecord)
        .on('error', this._onError)
        .on('end', this._onEnd)
      startedParsing = true
    }
    return startedParsing
  }

  /**
   * @desc Alias for {@link start} except that you can supply the path to the WARC file to be parsed
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

  /**
   * @desc Listener for a parsers record event
   * @param {WARCRecord} record
   * @private
   */
  _onRecord (record) {
    this.emit('record', record)
  }

  /**
   * @desc Listener for a parsers done event
   * @private
   */
  _onEnd () {
    this._parsing = false
    this.emit('done')
  }

  /**
   * @desc Listener for a parsers error event
   * @param {Error} error
   * @private
   */
  _onError (error) {
    this.emit('error', error)
  }

  /**
   * @desc Returns a ReadStream for the WARC to be parsed.
   * If the WARC file is gziped the returned value will the
   * results of ``ReadStream.pipe(zlib.createGunzip())``
   * @returns {ReadStream|Gunzip}
   * @private
   */
  _getStream () {
    const isGz = GzipDetector.isGzippedSync(this._wp)
    const stream = fs.createReadStream(untildify(this._wp))
    if (isGz) return stream.pipe(zlib.createGunzip())
    return stream
  }
}

/**
 * @type {AutoWARCParser}
 */
module.exports = AutoWARCParser
