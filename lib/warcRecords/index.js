const ContentParser = require('./warcContentParsers')

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

class WARCRecord {
  /**
   * @desc Create a new WARCRecord
   * @param {Object} header the warc header fields
   * @param {string} type - The type of record
   */
  constructor (header, type) {
    /**
     * @type {Object}
     */
    this.warcHeader = header
    /**
     * @type {string}
     */
    this.type = type
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
 * @desc WARC-TYPE: warcinfo
 */
class WARCInfoRecord extends WARCRecord {
  /**
   * @desc Create a new WARCInfoRecord
   * @param {Object} header the warc header fields
   * @param {Buffer[]} contentBuffers the warc records contents
   */
  constructor (header, contentBuffers) {
    super(header, WARCTypes.warcinfo)
    /**
     * @type {Object}
     */
    this.content = ContentParser.parseWarcInfoMetaDataContent(contentBuffers)
  }
}

/**
 * @desc WARC-TYPE: metadata
 */
class WARCMetaDataRecord extends WARCRecord {
  /**
   * @desc Create a new WARCMetaDataRecord
   * @param {Object} header the warc header fields
   * @param {Buffer[]} contentBuffers the warc records contents
   */
  constructor (header, contentBuffers) {
    super(header, WARCTypes.metadata)
    /**
     * @type {Object}
     */
    this.content = ContentParser.parseWarcInfoMetaDataContent(contentBuffers)
  }
}

/**
 * @desc WARC-TYPE: request
 */
class WARCRequestRecord extends WARCRecord {
  /**
   * @desc Create a new WARCRequestRecord
   * @param {Object} header the warc header fields
   * @param {Buffer[]} httpBuffers
   * @param {Buffer[]} postBuffers
   */
  constructor (header, httpBuffers, postBuffers) {
    super(header, WARCTypes.request)

    /**
     * @type {Object}
     */
    this.httpInfo = ContentParser.parseReqHTTP(httpBuffers)

    /**
     * @desc The post data of the request. This property is only on a {@link WARCRequestRecord} if it corresponds to
     * a post request
     * @type {?Buffer}
     */
    this.postBuffer =
      this.httpInfo.method === 'POST' ? Buffer.concat(postBuffers || []) : null
  }
}

/**
 * @desc WARC-TYPE: response
 */
class WARCResponseRecord extends WARCRecord {
  /**
   * @desc Create a new WARCResponseRecord
   * @param {Object} header the warc header fields
   * @param {Buffer[]} httpBuffers
   * @param {Buffer[]} bodyBuffers
   */
  constructor (header, httpBuffers, bodyBuffers) {
    super(header, WARCTypes.response)

    /**
     * @type {Object}
     */
    this.httpInfo =
      this.warcContentType === 'text/dns'
        ? {}
        : ContentParser.parseResHTTP(httpBuffers)

    /**
     * @type {Buffer}
     */
    this.bodyBuffer = Buffer.concat(bodyBuffers || [])
  }
}

/**
 * @desc WARC-TYPE: revisit
 */
class WARCRevisitRecord extends WARCRecord {
  /**
   * @desc Create a new WARCResponseRecord
   * @param {Object} header the warc header fields
   * @param {Buffer[]} httpBuffers
   */
  constructor (header, httpBuffers) {
    super(header, WARCTypes.revisit)
    /**
     * @type {Object}
     */
    this.httpHeaders = ContentParser.parseResHTTP(httpBuffers)
  }
}

/**
 * @desc WARC-TYPE: resource
 */
class WARCResourceRecord extends WARCRecord {
  /**
   * @desc Create a new WARCResponseRecord
   * @param {Object} header the warc header fields
   * @param {Buffer[]} contentBuffers
   */
  constructor (header, contentBuffers) {
    super(header, WARCTypes.resource)
    /**
     * @type {Buffer}
     */
    this.contentBuffers = Buffer.concat(contentBuffers)
  }
}

/**
 * @desc WARC-TYPE: continuation
 */
class WARCContinuationRecord extends WARCRecord {
  /**
   * @desc Create a new WARCResponseRecord
   * @param {Object} header the warc header fields
   * @param {Buffer[]} contentBuffers
   */
  constructor (header, contentBuffers) {
    super(header, WARCTypes.continuation)
    /**
     * @type {Buffer}
     */
    this.contentBuffers = Buffer.concat(contentBuffers)
  }
}

/**
 * @desc WARC-TYPE: conversion
 */
class WARCConversionRecord extends WARCRecord {
  /**
   * @desc Create a new WARCResponseRecord
   * @param {Object} header the warc header fields
   * @param {Buffer[]} contentBuffers
   */
  constructor (header, contentBuffers) {
    super(header, WARCTypes.conversion)
    /**
     * @type {Buffer}
     */
    this.contentBuffers = Buffer.concat(contentBuffers)
  }
}

/**
 * @desc This class is this libraries attempt at being lenient about parsing.
 */
class WARCUnknownRecord extends WARCRecord {
  /**
   * @desc Create a new WARCResponseRecord
   * @param {Object} header the warc header fields
   * @param {Buffer[]} content1
   * @param {Buffer[]} content2
   */
  constructor (header, content1, content2) {
    super(header, WARCTypes.unknown)
    /**
     * @type {Buffer[]}
     */
    this.content1 = content1
    /**
     * @type {Buffer[]}
     */
    this.content2 = content2
  }
}

const WTypeKey = 'WARC-Type'

/**
 * @param recordParts
 * @return {WARCConversionRecord | WARCContinuationRecord | WARCMetaDataRecord | WARCResourceRecord | WARCRevisitRecord | WARCResponseRecord | WARCRequestRecord | WARCInfoRecord | WARCUnknownRecord}
 */
function createRecord (recordParts) {
  const header = ContentParser.parseWarcRecordHeader(recordParts.header)
  switch (header[WTypeKey]) {
    case WARCTypes.continuation:
      return new WARCContinuationRecord(header, recordParts.c1)
    case WARCTypes.conversion:
      return new WARCConversionRecord(header, recordParts.c1)
    case WARCTypes.metadata:
      return new WARCMetaDataRecord(header, recordParts.c1)
    case WARCTypes.resource:
      return new WARCResourceRecord(header, recordParts.c1)
    case WARCTypes.revisit:
      return new WARCRevisitRecord(header, recordParts.c1)
    case WARCTypes.response:
      return new WARCResponseRecord(
        header,
        recordParts.c1,
        recordParts.c2
      )
    case WARCTypes.request:
      return new WARCRequestRecord(
        header,
        recordParts.c1,
        recordParts.c2
      )
    case WARCTypes.warcinfo:
      return new WARCInfoRecord(header, recordParts.c1)
    default:
      return new WARCUnknownRecord(
        header,
        recordParts.c1,
        recordParts.c2
      )
  }
}

module.exports = {
  WARCTypes,
  WARCInfoRecord,
  WARCMetaDataRecord,
  WARCRequestRecord,
  WARCResponseRecord,
  WARCRevisitRecord,
  WARCUnknownRecord,
  WARCResourceRecord,
  WARCContinuationRecord,
  createRecord
}
