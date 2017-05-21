/** @ignore */
const bsplit = require('binary-split')
/** @ignore */
const untildify = require('untildify')
/** @ignore */
const fs = require('fs-extra')
/** @ignore */
const zlib = require('zlib')
const EventEmitter = require('eventemitter3')
const WARCRecorderBuilder = require('../warcRecordBuilder')
const warcFieldIdentifiers = require('./fieldIdentifiers')

/**
 * @desc Parse a WARC.gz file
 * @extends {EventEmitter}
 * @example
 *  const parser = new WARCGzParser('<path-to-warcfile>')
 *  parser.on('record', record => { console.log(record) })
 *  parser.on('done', finalRecord => { console.log(finalRecord) })
 *  parser.on('error', error => { console.error(error) })
 *  parser.start()
 * @example
 *  const parser = new WARCGzParser()
 *  parser.on('record', record => { console.log(record) })
 *  parser.on('done', finalRecord => { console.log(finalRecord) })
 *  parser.on('error', error => { console.error(error) })
 *  parser.parseWARC('<path-to-warcfile>')
 */
class WARCGzParser extends EventEmitter {
  /**
   * @desc Create a new WARCGzParser
   * @param {?string} wp path to the warc.gz file tobe parsed
   */
  constructor (wp = null) {
    super()
    /**
     * @type {?string} the path to the WARC.gz file to be parsed
     * @private
     */
    this._wp = wp

    /**
     * @type {ReadStream} the underlying ReadStream
     * @private
     */
    this._readStream = null

    /**
     * @type {boolean} should the parser check the current lines buffer for the warctype
     * @private
     */
    this._checkRecType = false

    /**
     * @type {boolean} have we identified the records correct WARC-Type for the record
     * @private
     */
    this._foundType = false

    /**
     * @type {boolean} is the parser just starting to parse the WARC.gz file
     * @private
     */
    this._starting = true

    /**
     * @type {boolean} is the parser currently parsing the WARC.gz
     * @private
     */
    this._parsing = false

    /**
     * @type {{count: number, increment: function, reset: function}}
     * @private
     */
    this._crlfCounter = {
      count: 0,
      increment () {
        this.count += 1
      },
      reset () {
        this.count = 0
      }
    }
    /**
     * @type {WARCRecorderBuilder}
     * @private
     */
    this._builder = new WARCRecorderBuilder()
  }

  /**
   * @desc Begin parsing the WARC.gz file. Once the start method has been called the parser will begin emitting
   * @emits {record} emitted when the parser has parsed a full record, the argument supplied to the listener will be the parsed record
   * @emits {done} emitted when the WARC.gz file has been completely parsed, the argument supplied to the listener will be last record
   * @emits {error} emitted if an exception occurs, the argument supplied to the listener will be the error that occurred.
   * @return {boolean} indication if the parser has begun or is currently parsing a WARC.gz file
   * - true: indicates the parser has begun parsing the WARC.gz file true
   * - false: indicated the parser is currently parsing a WARC.gz file
   * @throws {Error} if the path to the WARC.gz file is null or undefined or another error occurred
   */
  start () {
    if (!this._parsing) {
      if (this._wp === null || this._wp === undefined) {
        throw new Error('The path to the WARC file is undefined')
      }
      this._starting = true
      this._parsing = true
      let lastBegin
      let buildKey
      let isEmptyLine
      let lastLineUnknown
      this._readStream = fs.createReadStream(untildify(this._wp))
      this._readStream
        .pipe(zlib.createGunzip())
        .pipe(bsplit())
        .on('data', (line) => {
          // console.log(line.toString())
          // if (buildKey === null || buildKey === undefined) {
          //   console.log(line.toString())
          // }
          if (warcFieldIdentifiers.begin.equals(line)) {
            if (!this._starting) {
              // if (buildKey === null || buildKey === undefined) {
              //   console.log('------------------------')
              // }
              let rec = this._builder.buildRecord(buildKey)
              this.emit('record', rec)
            } else {
              this._starting = false
            }
            this._crlfCounter.reset()
            this._checkRecType = true
            lastBegin = line
          } else {
            isEmptyLine = warcFieldIdentifiers.empty.equals(line)
            if (this._checkRecType && !isEmptyLine) {
              buildKey = this._checkType(line, lastBegin)
            } else if (isEmptyLine) {
              this._crlfCounter.increment()
            } else {
              this._builder.addLineTo(buildKey, this._crlfCounter.count, line)
            }
          }
        })
        .on('error', error => {
          this.emit('error', error)
        })
        .on('end', () => {
          this._parsing = false
          this.emit('done', this._builder.buildRecord(buildKey))
          this._readStream.destroy()
          this._builder.clear()
        })
    } else {
      return false
    }
  }

  /**
   * @desc Alias for {@link start} except that you can supply the path to the WARC.gz file to be parsed
   * if one was not supplied via the constructor or to parse another WARC.gz file. If the path to WARC.gz file
   * to be parsed was supplied via the constructor and you supply a different path to this method.
   * It will override the one supplied via the constructor
   * @param {?string} wp the path to the WARC.gz file to be parsed
   * @return {boolean} indication if the parser has begun or is currently parsing a WARC.gz file
   * @throws {Error} if the path to the WARC.gz file is null or undefined or another error occurred
   */
  parseWARC (wp) {
    if (!this._parsing) {
      this._wp = wp || this._wp
    }
    return this.start()
  }

  /**
   * @desc determine the WARC-Type for the record
   * @param {Buffer} line the WARC-Type line
   * @param {Buffer} lastBegin the WARC/1.0 line (WARC record begin)
   * @return {Symbol} the record key that identifies the WARC-Type being parsed
   * @private
   */
  _checkType (line, lastBegin) {
    this._checkRecType = false
    this._foundType = false
    this._foundType = warcFieldIdentifiers.req.equals(line)
    if (this._foundType) {
      return this._builder.initReq(lastBegin, line)
    } else {
      this._foundType = warcFieldIdentifiers.res.equals(line)
      if (this._foundType) {
        return this._builder.initRes(lastBegin, line)
      } else {
        this._foundType = warcFieldIdentifiers.revisit.equals(line)
        if (this._foundType) {
          return this._builder.initRevist(lastBegin, line)
        } else {
          this._foundType = warcFieldIdentifiers.info.equals(line)
          if (this._foundType) {
            return this._builder.initInfo(lastBegin, line)
          } else {
            this._foundType = warcFieldIdentifiers.mdata.equals(line)
            if (this._foundType) {
              return this._builder.initMdata(lastBegin, line)
            } else {
              console.log('unknown warc type', line, line.toString())
              this._checkRecType = true
            }
          }
        }
      }
    }
  }
}

module.exports = WARCGzParser
