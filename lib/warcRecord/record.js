'use strict'
const ContentParser = require('./warcContentParsers')
const { WARCTypes } = require('../writers/warcFields')
const { crlf } = require('./fieldIdentifiers')

function makeKVBuffer (k, v) {
  if (Array.isArray(v)) {
    const acum = []
    let totalLength = 0
    for (let i = 0; i < v.length; i++) {
      const aBuffer = Buffer.from(`${k}: ${v[i]}\r\n`)
      totalLength += aBuffer.length
      acum.push(aBuffer)
    }
    return Buffer.concat(acum, totalLength)
  }
  return Buffer.from(`${k}: ${v}\r\n`)
}

/**
 * WARC record class. The WARC named fields are properties on this object
 */
class WARCRecord {
  /**
   * Create a new WARCRecord
   * @param {{header: (Buffer[]|Map<string, string|Array<string>>), c1: Buffer[], c2: Buffer[]}} warcParts - The parts of a warc record
   */
  constructor (warcParts) {
    /**
     * An object containing the parsed WARC header
     * @type {Map<string, string|Array<string>>}
     */
    this.warcHeader = Array.isArray(warcParts.header)
      ? ContentParser.parseWarcRecordHeader(warcParts.header)
      : warcParts.header

    /**
     * An object containing the parsed request or response records HTTP information
     * @type {?RequestHTTP|?ResponseHTTP}
     */
    this.httpInfo = null

    /**
     * The content of the record.
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
   * Determine if this warc record header has the supplied WARC named field.
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
    return this.warcHeader.has(headerKey)
  }

  /**
   * Retrieve the value of this records header field.
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
    return this.warcHeader.get(headerKey)
  }

  warcHeadersAsBuffer () {
    const warcParts = []
    const otherParts = []
    let totalLength = 0
    for (const [headerKey, headerValue] of this.warcHeader.entries()) {
      const buffer = makeKVBuffer(headerKey, headerValue)
      totalLength += buffer.length
      if (headerKey === 'WARC') {
        warcParts.unshift(buffer)
      } else if (headerKey[0] === 'W') {
        warcParts.push(buffer)
      } else {
        otherParts.push(buffer)
      }
    }
    return Buffer.concat(warcParts.concat(otherParts), totalLength)
  }

  httpPortionAsBuffer () {
    if (!this.httpInfo) return Buffer.from([])
    let aBuffer = Buffer.from(
      `${this.httpInfo.requestLine || this.httpInfo.statusLine}\r\n`
    )
    let totalLen = aBuffer.length
    const parts = [aBuffer]
    for (const [httpKey, httpValue] of this.httpInfo.headers.entries()) {
      aBuffer = makeKVBuffer(httpKey, httpValue)
      totalLen += aBuffer.length
      parts.push(aBuffer)
    }
    return Buffer.concat(parts, totalLen)
  }

  /**
   * Returns this warc record as a buffer suitable for writing to a warc file
   * @returns {Buffer}
   */
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
    return this.warcHeader.get('WARC-Type')
  }

  /**
   * @return {?string}
   */
  get warcRecordID () {
    return this.warcHeader.get('WARC-Record-ID')
  }

  /**
   * @return {?string}
   */
  get warcDate () {
    return this.warcHeader.get('WARC-Date')
  }

  /**
   * @return {?string}
   */
  get warcContentLength () {
    return this.warcHeader.get('Content-Length')
  }

  /**
   * @return {?string}
   */
  get warcContentType () {
    return this.warcHeader.get('Content-Type')
  }

  /**
   * @return {?string}
   */
  get warcConcurrentTo () {
    return this.warcHeader.get('WARC-Concurrent-To')
  }

  /**
   * @return {?string}
   */
  get warcBlockDigest () {
    return this.warcHeader.get('WARC-Block-Digest')
  }

  /**
   * @return {?string}
   */
  get warcPayloadDigest () {
    return this.warcHeader.get('WARC-Payload-Digest')
  }

  /**
   * @return {?string}
   */
  get warcIPAddress () {
    return this.warcHeader.get('WARC-IP-Address')
  }

  /**
   * @return {?string}
   */
  get warcRefersTo () {
    return this.warcHeader.get('WARC-Refers-To')
  }

  /**
   * @return {?string}
   */
  get warcRefersToTargetURI () {
    return this.warcHeader.get('WARC-Refers-To-Target-URI')
  }

  /**
   * @return {?string}
   */
  get warcRefersToDate () {
    return this.warcHeader.get('WARC-Refers-To-Date')
  }

  /**
   * @return {?string}
   */
  get warcTargetURI () {
    return this.warcHeader.get('WARC-Target-URI')
  }

  /**
   * @return {?string}
   */
  get warcTruncated () {
    return this.warcHeader.get('WARC-Truncated')
  }

  /**
   * @return {?string}
   */
  get warcWarcinfoID () {
    return this.warcHeader.get('WARC-Warcinfo-ID')
  }

  /**
   * @return {?string}
   */
  get warcFilename () {
    return this.warcHeader.get('WARC-Filename')
  }

  /**
   * @return {?string}
   */
  get warcProfile () {
    return this.warcHeader.get('WARC-Profile')
  }

  /**
   * @return {?string}
   */
  get warcIdentifiedPayloadType () {
    return this.warcHeader.get('WARC-Identified-Payload-Type')
  }

  /**
   * @return {?string}
   */
  get warcSegmentOriginID () {
    return this.warcHeader.get('WARC-Segment-Origin-ID')
  }

  /**
   * @return {?string}
   */
  get warcSegmentNumber () {
    return this.warcHeader.get('WARC-Segment-Number')
  }

  /**
   * @return {?string}
   */
  get warcSegmentTotalLength () {
    return this.warcHeader.get('WARC-Segment-Total-Length')
  }
}

module.exports = WARCRecord
