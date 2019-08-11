'use strict'
const { Transform } = require('stream')
const WARCRecord = require('../warcRecord/record')
const { WARCTypes } = require('../writers/warcFields')
const ContentParser = require('../warcRecord/warcContentParsers')
const { crlf, begin } = require('../warcRecord/fieldIdentifiers')

/**
 * @type {{header: symbol, content1: symbol, content2: symbol, consumeCRLFHeader: symbol, consumeCRLFContent1: symbol, consumeCRLFContent2: symbol}}
 */
const parsingStates = {
  header: Symbol('warc-parsing-header'),
  content1: Symbol('warc-parsing-content1'),
  content2: Symbol('warc-parsing-content2'),
  consumeCRLFHeader: Symbol('warc-parsing-comsume-crlf-header'),
  consumeCRLFContent1: Symbol('warc-parsing-comsume-crlf-c1'),
  consumeCRLFContent2: Symbol('warc-parsing-comsume-crlf-c2'),
  consumeUntilContentLength: Symbol(
    'warc-parsing-consume-until-content-length'
  ),
  noop: Symbol('warc-parsing-noop')
}

/**
 * @param {Buffer} line
 * @returns {boolean}
 */
function isJustCRLF (line) {
  if (line.length !== 2) return false
  return line[0] === crlf[0] && line[1] === crlf[1]
}

/**
 * @param {Buffer} line
 * @returns {boolean}
 */
function isWARCRevisionLine (line) {
  if (line.length > 11) return false
  for (let i = 0; i < begin.length; i++) {
    if (begin[i] !== line[i]) return false
  }
  return true
}

/**
 * @desc Transforms a WARC file ReadStream into its individual {@link WARCRecord}s
 * @extends {Transform}
 * @example
 *  fs.createReadStream('someWARC.warc')
 *    .pipe(new WARCStreamTransform())
 *    .on('data', record => { console.log(record) })
 * @example
 *  fs.createReadStream('someWARC.warc.gz')
 *    .pipe(zlib.createGunzip())
 *    .pipe(new WARCStreamTransform())
 *    .on('data', record => { console.log(record) })
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
     * @type {number}
     */
    this.sepLen = crlf.length

    this.wHeaderParts = []
    this.wHeader = null
    this.wContentP1 = []
    this.wContentP2 = []
    this.currentContentLength = 0
    this.wContentLength = 0
    this.contentFirstSep = false
    this.parsingState = parsingStates.noop
    this.wType = null
  }

  _buildAndPushRecord () {
    if (!this.wHeader) return
    this.push(
      new WARCRecord({
        header: this.wHeader,
        c1: this.wContentP1,
        c2: this.wContentP2
      })
    )
    this.wHeader = null
    this.wHeaderParts = []
    this.wContentP1 = []
    this.wContentP2 = []
    this.contentFirstSep = false
    this.currentContentLength = 0
    this.wContentLength = 0
    this.wType = null
  }

  /**
   * @param {Buffer} line
   */
  _handleLine (line) {
    let isSep = false
    if (isWARCRevisionLine(line)) {
      this.parsingState = parsingStates.header
    } else {
      isSep = isJustCRLF(line)
    }
    switch (this.parsingState) {
      case parsingStates.header:
        if (!isSep) {
          this.wHeaderParts.push(line)
        } else {
          this.parsingState = parsingStates.consumeUntilContentLength
          this.wHeader = ContentParser.parseWarcRecordHeader(this.wHeaderParts)
          this.wHeaderParts = null
          this.wContentLength = Number(this.wHeader['Content-Length'])
          this.wType = this.wHeader['WARC-Type']
        }
        break
      case parsingStates.consumeUntilContentLength:
        this.currentContentLength += line.length
        switch (this.wType) {
          case WARCTypes.request:
          case WARCTypes.response:
            if (!isSep && !this.contentFirstSep) {
              this.wContentP1.push(line)
            } else if (isSep && !this.contentFirstSep) {
              this.contentFirstSep = true
            } else if (this.contentFirstSep) {
              this.wContentP2.push(line)
            }
            break
          default:
            this.wContentP1.push(line)
            break
        }
        if (this.currentContentLength === this.wContentLength) {
          this.parsingState = parsingStates.noop
          this._buildAndPushRecord()
        }
        break
    }
  }

  /**
   * @desc Process the supplied chunk
   * @param {Buffer} chunk  - The chunk to be processed
   * @param {function} done - Function used to indicate we are done processing the chunk
   * @param {boolean} [pushLast] - Boolean indicating if we attempt to build a record and push it once
   * we are done processing the chunk IFF a record was built. Is only true when called from {@link _flush}
   * @private
   */
  _consumeChunk (chunk, done, pushLast) {
    let offset = 0
    let lastMatch = 0
    let idx
    const chunkLen = chunk.length
    while (true) {
      idx = offset >= chunkLen ? -1 : chunk.indexOf(crlf, offset)
      if (idx !== -1 && idx < chunk.length) {
        this._handleLine(chunk.slice(lastMatch, idx + this.sepLen))
        offset = idx + this.sepLen
        lastMatch = offset
      } else {
        this.buffered = chunk.slice(lastMatch)
        if (pushLast) {
          this._handleLine(this.buffered)
          this._buildAndPushRecord()
        }
        break
      }
    }
    done()
  }

  /**
   * @desc Process a chunk
   * @param {Buffer} buf - The chunk to be processed
   * @param {string} enc - The encoding of the chunk
   * @param {function} done - Function used to indicate we are done processing the chunk
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
   * @desc Flushes any remaining data
   * @param {function} done - Function used to indicate we are done processing the chunk
   * @private
   */
  _flush (done) {
    if (this.buffered) {
      this._consumeChunk(this.buffered, done, true)
    } else {
      done()
    }
  }
}

/**
 * @type {WARCStreamTransform}
 */
module.exports = WARCStreamTransform
