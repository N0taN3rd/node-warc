'use strict'
const ContentParser = require('./warcContentParsers')
const { WARCTypes } = require('../writers/warcFields')
const { crlf } = require('./fieldIdentifiers')

/**
 * @desc WARC record class. The WARC named fields are properties on this object
 */
class WARCRecord {
  /**
   * @desc Create a new WARCRecord
   * @param {{header: (Buffer[]|Object), c1: Buffer[], c2: Buffer[]}} warcParts - The parts of a warc record
   */
  constructor (warcParts) {
    /**
     * @desc An object containing the parsed WARC header
     * @type {Object}
     */
    this.warcHeader = Array.isArray(warcParts.header)
      ? ContentParser.parseWarcRecordHeader(warcParts.header)
      : warcParts.header

    /**
     * @desc An object containing the parsed request or response records HTTP information
     * @type {?RequestHTTP|?ResponseHTTP}
     */
    this.httpInfo = null

    /**
     * @desc The content of the record.
     * @type {Buffer}
     */
    this.content = null

    const wt = this.warcType
    switch (wt) {
      case WARCTypes.request:
      case WARCTypes.response:
        this.httpInfo = ContentParser.parseHTTPPortion(
          warcParts.c1,
          wt === WARCTypes.request
        )
        this.content = Buffer.concat(warcParts.c2 || [])
        break
      case WARCTypes.revisit:
        this.httpInfo = ContentParser.parseResHTTP(warcParts.c1)
        break
      default:
        this.content = Buffer.concat(warcParts.c1 || [])
        break
    }
  }

  /**
   * @desc Determine if this warc record header has the supplied WARC named field.
   * If the supplied header key does not start with WARC then this it will be added.
   * @example
   *  // both ways are equivalent to determine if the record has the WARC-Type field
   *  record.hasWARCHeader('WARC-Type')
   *  record.hasWARCHeader('Type')
   * @param {!string} headerKey - The WARC header key (named field)
   * @return {boolean}
   */
  hasWARCHeader (headerKey) {
    if (!headerKey.startsWith('WARC')) {
      headerKey = `WARC-${headerKey}`
    }
    return this.warcHeader[headerKey] != null
  }

  /**
   * @desc Retrieve the value of this records header field.
   * If the supplied header key does not start with WARC then this it will be added.
   * @example
   *  // both ways are equivalent to retrieve WARC-Type field
   *  record.getWARCHeader('WARC-Type')
   *  record.getWARCHeader('Type')
   * @param {!string} headerKey - The WARC header key (named field)
   * @return {?string}
   */
  getWARCHeader (headerKey) {
    if (!headerKey.startsWith('WARC')) {
      headerKey = `WARC-${headerKey}`
    }
    return this.warcHeader[headerKey]
  }

  warcHeadersAsBuffer () {
    const warcParts = []
    const otherParts = []
    for (const headerKey in this.warcHeader) {
      if (headerKey === 'WARC') warcParts.unshift(headerKey)
      else if (headerKey[0] === 'W') warcParts.push(headerKey)
      else otherParts.push(headerKey)
    }
    const results = new Array(warcParts.length + otherParts.length)
    let totalLength = 0
    let aBuffer
    let combo = 0
    for (let i = 0; i < warcParts.length; i++) {
      aBuffer = Buffer.from(
        `${warcParts[i]}: ${this.warcHeader[warcParts[i]]}\r\n`
      )
      results[combo] = aBuffer
      totalLength += aBuffer.length
      combo += 1
    }
    for (let i = 0; i < otherParts.length; i++) {
      aBuffer = Buffer.from(
        `${otherParts[i]}: ${this.warcHeader[otherParts[i]]}\r\n`
      )
      results[combo] = aBuffer
      totalLength += aBuffer.length
      combo += 1
    }
    return Buffer.concat(results, totalLength)
  }

  httpPortionAsBuffer () {
    if (!this.httpInfo) return Buffer.from([])
    let aBuffer = Buffer.from(
      `${this.httpInfo.requestLine || this.httpInfo.statusLine}\r\n`
    )
    let totalLen = aBuffer.length
    const parts = [aBuffer]
    const headers = this.httpInfo.headers
    for (const httHeaderKey in headers) {
      aBuffer = Buffer.from(`${httHeaderKey}: ${headers[httHeaderKey]}\r\n`)
      parts.push(aBuffer)
      totalLen += aBuffer.length
    }
    return Buffer.concat(parts, totalLen)
  }

  asBuffer () {
    const header = this.warcHeadersAsBuffer()
    switch (this.warcType) {
      case WARCTypes.request:
      case WARCTypes.response: {
        const http = this.httpPortionAsBuffer()
        if (this.content.length) {
          return Buffer.concat(
            [header, crlf, http, crlf, this.content],
            header.length + http.length + this.content.length + crlf.length * 2
          )
        }
        return Buffer.concat(
          [header, crlf, http],
          header.length + http.length + crlf.length
        )
      }
      case WARCTypes.revisit: {
        const http = this.httpPortionAsBuffer()
        return Buffer.concat(
          [header, crlf, http],
          header.length + http.length + crlf.length
        )
      }
      default:
        return Buffer.concat(
          [header, crlf, this.content],
          header.length + this.content.length + crlf.length
        )
    }
  }

  /**
   * @return {?string}
   */
  get warcType () {
    return this.warcHeader['WARC-Type']
  }

  /**
   * @return {?string}
   */
  get warcRecordID () {
    return this.warcHeader['WARC-Record-ID']
  }

  /**
   * @return {?string}
   */
  get warcDate () {
    return this.warcHeader['WARC-Date']
  }

  /**
   * @return {?string}
   */
  get warcContentLength () {
    return this.warcHeader['Content-Length']
  }

  /**
   * @return {?string}
   */
  get warcContentType () {
    return this.warcHeader['Content-Type']
  }

  /**
   * @return {?string}
   */
  get warcConcurrentTo () {
    return this.warcHeader['WARC-Concurrent-To']
  }

  /**
   * @return {?string}
   */
  get warcBlockDigest () {
    return this.warcHeader['WARC-Block-Digest']
  }

  /**
   * @return {?string}
   */
  get warcPayloadDigest () {
    return this.warcHeader['WARC-Payload-Digest']
  }

  /**
   * @return {?string}
   */
  get warcIPAddress () {
    return this.warcHeader['WARC-IP-Address']
  }

  /**
   * @return {?string}
   */
  get warcRefersTo () {
    return this.warcHeader['WARC-Refers-To']
  }

  /**
   * @return {?string}
   */
  get warcRefersToTargetURI () {
    return this.warcHeader['WARC-Refers-To-Target-URI']
  }

  /**
   * @return {?string}
   */
  get warcRefersToDate () {
    return this.warcHeader['WARC-Refers-To-Date']
  }

  /**
   * @return {?string}
   */
  get warcTargetURI () {
    return this.warcHeader['WARC-Target-URI']
  }

  /**
   * @return {?string}
   */
  get warcTruncated () {
    return this.warcHeader['WARC-Truncated']
  }

  /**
   * @return {?string}
   */
  get warcWarcinfoID () {
    return this.warcHeader['WARC-Warcinfo-ID']
  }

  /**
   * @return {?string}
   */
  get warcFilename () {
    return this.warcHeader['WARC-Filename']
  }

  /**
   * @return {?string}
   */
  get warcProfile () {
    return this.warcHeader['WARC-Profile']
  }

  /**
   * @return {?string}
   */
  get warcIdentifiedPayloadType () {
    return this.warcHeader['WARC-Identified-Payload-Type']
  }

  /**
   * @return {?string}
   */
  get warcSegmentOriginID () {
    return this.warcHeader['WARC-Segment-Origin-ID']
  }

  /**
   * @return {?string}
   */
  get warcSegmentNumber () {
    return this.warcHeader['WARC-Segment-Number']
  }

  /**
   * @return {?string}
   */
  get warcSegmentTotalLength () {
    return this.warcHeader['WARC-Segment-Total-Length']
  }
}

module.exports = WARCRecord
