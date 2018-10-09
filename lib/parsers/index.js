const EventEmitter = require('eventemitter3')
const GzipDetector = require('./gzipDetector')
const WARCGzParser = require('./warcGzParser')
const WARCParser = require('./warcParser')

/**
 * @desc Parse a WARC file automatically detecting if it is gzipped.
 * See {@link GzipDetector}, {@link WARCGzParser}, {@link WARCParser}
 * @extends {EventEmitter}
 * @example
 *  const parser = new AutoWARCParser('<path-to-warcfile>')
 *  parser.on('record', record => { console.log(record) })
 *  parser.on('done', finalRecord => { console.log(finalRecord) })
 *  parser.on('error', error => { console.error(error) })
 *  parser.start()
 * @example
 *  const parser = new AutoWARCParser()
 *  parser.on('record', record => { console.log(record) })
 *  parser.on('done', finalRecord => { console.log(finalRecord) })
 *  parser.on('error', error => { console.error(error) })
 *  parser.parseWARC('<path-to-warcfile>')
 */
class AutoWARCParser extends EventEmitter {
  /**
   * @desc Create a new AutoWARCParser
   * @param {?string} wp path to the warc file tobe parsed
   */
  constructor (wp = null) {
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

    /**
     * @type {?WARCGzParser}
     * @private
     */
    this._gzipParser = null

    /**
     * @type {?WARCParser}
     * @private
     */
    this._notGzipParser = null

    /** @ignore */
    this._onRecord = this._onRecord.bind(this)
    /** @ignore */
    this._onDone = this._onDone.bind(this)
    /** @ignore */
    this._onError = this._onError.bind(this)
  }

  /**
   * @desc Begin parsing the WARC file. Once the start method has been called the parser will begin emitting
   * @emits {record} emitted when the parser has parsed a full record, the argument supplied to the listener will be the parsed record
   * @emits {done} emitted when the WARC file has been completely parsed, the argument supplied to the listener will be last record
   * @emits {error} emitted if an exception occurs, the argument supplied to the listener will be the error that occurred.
   * @return {boolean} indication if the parser has begun or is currently parsing a WARC file
   * - true: indicates the parser has begun parsing the WARC file true
   * - false: indicated the parser is currently parsing a WARC file
   * @throws {Error} if the path to the WARC file is null or undefined or another error occurred
   */
  start () {
    if (!this._parsing) {
      if (this._wp === null || this._wp === undefined) {
        throw new Error('The path to the WARC file is undefined')
      }
      this._parsing = true
      let isGzipped = GzipDetector.isGzippedSync(this._wp)
      return this._getParser(isGzipped).parseWARC(this._wp)
    } else {
      return false
    }
  }

  /**
   * @desc Alias for {@link start} except that you can supply the path to the WARC file to be parsed
   * if one was not supplied via the constructor or to parse another WARC file. If the path to WARC file
   * to be parsed was supplied via the constructor and you supply a different path to this method.
   * It will override the one supplied via the constructor
   * @param {?string} wp the path to the WARC file to be parsed
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
   * @desc Lazily create a parser
   * @param {boolean} isGzipped
   * @return {WARCGzParser|WARCParser}
   * @private
   */
  _getParser (isGzipped) {
    if (isGzipped) {
      if (this._gzipParser === null || this._gzipParser === undefined) {
        this._gzipParser = new WARCGzParser()
        this._gzipParser.on('record', this._onRecord)
        this._gzipParser.on('done', this._onDone)
        this._gzipParser.on('error', this._onError)
      }
      return this._gzipParser
    } else {
      if (this._notGzipParser === null || this._notGzipParser === undefined) {
        this._notGzipParser = new WARCParser()
        this._notGzipParser.on('record', this._onRecord)
        this._notGzipParser.on('done', this._onDone)
        this._notGzipParser.on('error', this._onError)
      }
      return this._notGzipParser
    }
  }

  /**
   * @desc Listener for a parsers record event
   * @param {WARCInfoRecord|WARCMetaDataRecord|WARCRequestRecord|WARCResponseRecord} record
   * @private
   */
  _onRecord (record) {
    this.emit('record', record)
  }

  /**
   * @desc Listener for a parsers done event
   * @param {WARCInfoRecord|WARCMetaDataRecord|WARCRequestRecord|WARCResponseRecord} finalRecord
   * @private
   */
  _onDone (finalRecord) {
    this._parsing = false
    this.emit('done', finalRecord)
  }

  /**
   * @desc Listener for a parsers error event
   * @param {Error} error
   * @private
   */
  _onError (error) {
    this.emit('error', error)
  }
}

module.exports = AutoWARCParser
module.exports.WARCGzParser = WARCGzParser
module.exports.WARCParser = WARCParser
