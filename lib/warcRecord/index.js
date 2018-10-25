const ContentParser = require('./warcContentParsers')

/**
 * @type {{warcinfo: string, metadata: string, request: string, response: string, revisit: string, resource: string, conversion: string, unknown: string, continuation: string}}
 */
const WARCTypes = {
  warcinfo: 'warcinfo',
  metadata: 'metadata',
  request: 'request',
  response: 'response',
  revisit: 'revisit',
  resource: 'resource',
  conversion: 'conversion',
  unknown: 'unknown',
  continuation: 'continuation'
}

/**
 *
 */
class WARCRecord {
  /**
   * @desc Create a new WARCRecord
   * @param {{header: Buffer[], c1: Buffer[], c2: Buffer[]}} warcParts
   */
  constructor (warcParts) {
    /**
     * @type {Object}
     */
    this.warcHeader = ContentParser.parseWarcRecordHeader(warcParts.header)
    /**
     * @type {?Object}
     */
    this.httpInfo = null
    /**
     * @type {?Object | ?Buffer}
     */
    this.content = null
    const wt = this.warcType
    switch (wt) {
      case WARCTypes.request:
      case WARCTypes.response:
      case WARCTypes.revisit:
        this.httpInfo = ContentParser.parseHTTPPortion(
          warcParts.c1,
          wt === WARCTypes.request
        )
        this.content = Buffer.concat(warcParts.c2 || [])
        break
      case WARCTypes.warcinfo:
      case WARCTypes.metadata:
        this.content = ContentParser.parseWarcInfoMetaDataContent(warcParts.c1)
        break
      default:
        this.content = Buffer.concat(warcParts.c1 || [])
        break
    }
  }

  /**
   * @param {!string} headerKey
   * @return {boolean}
   */
  hasWARCHeader (headerKey) {
    if (!headerKey.startsWith('WARC')) {
      headerKey = `WARC-${headerKey}`
    }
    return this.warcHeader[headerKey] != null
  }

  /**
   * @param {!string} headerKey
   * @return {?string}
   */
  getWARCHeader (headerKey) {
    if (!headerKey.startsWith('WARC')) {
      headerKey = `WARC-${headerKey}`
    }
    return this.warcHeader[headerKey]
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

/**
 * @type {WARCRecord}
 */
module.exports = WARCRecord
