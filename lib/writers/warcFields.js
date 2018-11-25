/**
 * @type {string}
 */
const CRLF = '\r\n'

/**
 * @type {string}
 */
const CRLF2x = '\r\n\r\n'

/**
 * @type {string}
 */
const recordSeparator = '\r\n\r\n'

/**
 * @type {string}
 */
const WARCV = '1.0'

/**
 * @type {string}
 */
const WARCSlashV = `WARC/${WARCV}${CRLF}`

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

const WARCContentTypes = {
  warcFields: 'Content-Type: application/warc-fields\r\n',
  httpRequest: 'Content-Type: application/http; msgtype=request\r\n',
  httpResponse: 'Content-Type: application/http; msgtype=response\r\n'
}

/**
 * @param {string} uuid
 * @return {string}
 */
function recordId (uuid) {
  return `WARC-Record-ID: <urn:uuid:${uuid}>${CRLF}`
}

/**
 * @param {string} date
 * @return {string}
 */
function warcDate (date) {
  return `WARC-Date: ${date}${CRLF}`
}

/**
 * @param {string} targetURI
 * @return {string}
 */
function warcTargetURI (targetURI) {
  return `WARC-Target-URI: ${targetURI}${CRLF}`
}

/**
 * @param {string} type
 * @return {string}
 */
function warcType (type) {
  return `WARC-Type: ${type}${CRLF}`
}

/**
 * @param {string} fileName
 * @return {string}
 */
function warcFilename (fileName) {
  return `WARC-Filename: ${fileName}${CRLF}`
}

/**
 * @param {string|number} contentLen
 * @return {string}
 */
function warcContentLength (contentLen) {
  return `Content-Length: ${contentLen}${CRLF}`
}

/**
 * @param {string} contentType
 * @return {string}
 */
function warcContentType (contentType) {
  return `Content-Type: ${contentType}${CRLF}`
}

/**
 * @param {string} concurrentTo
 * @return {string}
 */
function warcConcurrentTo (concurrentTo) {
  return `WARC-Concurrent-To: <urn:uuid:${concurrentTo}>${CRLF}`
}

/**
 * @param {string} wid
 * @return {string}
 */
function warcWarcInfoId (wid) {
  return `WARC-Warcinfo-ID: <urn:uuid:${wid}>${CRLF}`
}

/**
 *
 * @param {string} type
 * @param {Object} reqFields
 * @param {string} reqFields.rid
 * @param {string} reqFields.date
 * @param {number} reqFields.len
 * @param {?string} [reqFields.targetURI]
 * @return {string}
 */
function requiredHeaderFields (type, { rid, date, len, targetURI }) {
  if (targetURI != null) {
    return `${WARCSlashV}${warcType(type)}${recordId(rid)}${warcDate(
      date
    )}${warcTargetURI(targetURI)}${warcContentLength(len)}`
  }
  return `${WARCSlashV}${warcType(type)}${recordId(rid)}${warcDate(
    date
  )}${warcContentLength(len)}`
}

/**
 * @typedef {Object} WARCInfoHeader
 * @property {string} date - The date value for WARC-Date
 * @property {?string} [fileName] - The name of the warc file
 * @property {?string} [targetURI] - The target URI for the record
 * @property {string} rid - The id of the record
 * @property {number} len - The length of the records content
 */

/**
 * @param {WARCInfoHeader} infoHeader
 * @return {string}
 */
function warcInfoHeader (infoHeader) {
  const required = `${requiredHeaderFields(WARCTypes.warcinfo, infoHeader)}${
    WARCContentTypes.warcFields
  }`
  if (infoHeader.fileName != null) {
    return `${required}${warcFilename(infoHeader.fileName)}`
  }
  return required
}

/**
 * @typedef {Object} WARCInfoContent
 * @property {string} version - The version of node-warc used to create the record
 * @property {string} isPartOfV - The value for isPartOf
 * @property {string} warcInfoDescription - A description for the warc
 * @property {string} ua - The user agent used to create the record
 */

/**
 * @param {WARCInfoContent} infoContent
 * @return {string}
 */
function warcInfoContent ({ version, isPartOfV, warcInfoDescription, ua }) {
  const base = [
    `software: node-warc/${version}${CRLF}format: WARC File Format ${WARCV}${CRLF}robots: ignore${CRLF}`
  ]
  if (isPartOfV != null) {
    base.push(`isPartOf: ${isPartOfV}${CRLF}`)
  }
  if (warcInfoDescription != null) {
    base.push(`description: ${warcInfoDescription}${CRLF}`)
  }
  if (ua != null) {
    base.push(`http-header-user-agent: ${ua}${CRLF}`)
  }
  return base.join('')
}

/**
 * @typedef {Object} WARCMetadataHeader
 * @property {string} targetURI - The URI the records are for
 * @property {string} now - The date value for WARC-Date
 * @property {string} concurrentTo - The record id this metadata record is associated with
 * @property {string} rid - The record id of this record
 * @property {number} len - The length of this records content
 * @property {?string} wid - The record id of the Warcinfo record
 */

/**
 * @param {WARCMetadataHeader} metadataHeader
 * @returns {string}
 */
function warcMetadataHeader ({ targetURI, now, concurrentTo, rid, len, wid }) {
  const base = [
    requiredHeaderFields(WARCTypes.metadata, {
      date: now,
      len,
      rid,
      targetURI
    }),
    WARCContentTypes.warcFields
  ]
  if (concurrentTo != null) {
    base.push(warcConcurrentTo(concurrentTo))
  }
  if (wid != null) {
    base.push(warcWarcInfoId(wid))
  }
  return base.join('')
}

/**
 * @typedef {Object} WARCRequestHeader
 * @property {string} targetURI - The URI the record is for
 * @property {string} now - The date value for WARC-Date
 * @property {string} concurrentTo - The record id of the record this record associated with
 * @property {string} rid - The record id of this record
 * @property {number} len - The length of this records content
 * @property {?string} wid - The record id of the Warcinfo record
 */

/**
 * @param {WARCRequestHeader} requestHeader
 * @returns {string}
 */
function warcRequestHeader ({ targetURI, now, concurrentTo, rid, len, wid }) {
  const base = [
    requiredHeaderFields(WARCTypes.request, { date: now, len, rid, targetURI }),
    WARCContentTypes.httpRequest
  ]
  if (concurrentTo != null) {
    base.push(warcConcurrentTo(concurrentTo))
  }
  if (wid != null) {
    base.push(warcWarcInfoId(wid))
  }
  return base.join('')
}

/**
 * @typedef {Object} WARCResponseHeader
 * @property {string} targetURI - The URI the record is for
 * @property {string} now - The date value for WARC-Date
 * @property {string} rid - The record id of this record
 * @property {number} len - The length of this records content
 * @property {?string} wid - The record id of the Warcinfo record
 */

/**
 * @param {WARCResponseHeader} responseHeader
 * @returns {string}
 */
function warcResponseHeader ({ targetURI, now, rid, len, wid }) {
  const base = [
    requiredHeaderFields(WARCTypes.response, {
      date: now,
      len,
      rid,
      targetURI
    }),
    WARCContentTypes.httpResponse
  ]
  if (wid != null) {
    base.push(warcWarcInfoId(wid))
  }
  return base.join('')
}

module.exports = {
  requiredHeaderFields,
  /**
   * @type {function(headerInfo: WARCInfoHeader): string}
   */
  warcInfoHeader,
  /**
   * @type {function(infoContent: WARCInfoContent): string}
   */
  warcInfoContent,
  /**
   * @type {function(reqiestData: WARCRequestHeader): string}
   */
  warcRequestHeader,
  warcResponseHeader,
  warcMetadataHeader,
  recordSeparator,
  CRLF,
  CRLF2x,
  WARCTypes,
  WARCV,
  WARCContentTypes
}
