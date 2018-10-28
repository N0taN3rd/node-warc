/**
 * @typedef {Object} WARCInfoHeader
 * @property {string} now - The date value for WARC-Date
 * @property {string} fileName - The name of the warc file
 * @property {string} rid - The id of the record
 * @property {number} len - The length of the records content
 */

/**
 * @param {WARCInfoHeader} headerInfo
 * @returns {string}
 */
const warcHeader = ({ now, fileName, rid, len }) => `WARC/1.0\r
WARC-Type: warcinfo\r
WARC-Date: ${now}\r
WARC-Filename: ${fileName}\r
WARC-Record-ID: <urn:uuid:${rid}>\r
Content-Type: application/warc-fields\r
Content-Length: ${len}\r\n`

/**
 * @typedef {Object} WARCInfoContent
 * @property {string} version - The version of node-warc used to create the record
 * @property {string} isPartOfV - The value for isPartOf
 * @property {string} warcInfoDescription - A description for the warc
 * @property {string} ua - The user agent used to create the record
 */

/**
 * @param {WARCInfoContent} headerContent
 * @returns {string}
 */
const warcHeaderContent = ({
  version,
  isPartOfV,
  warcInfoDescription,
  ua
}) => `software: node-warc/${version}\r
format: WARC File Format 1.0\r
conformsTo: http://bibnum.bnf.fr/WARC/WARC_ISO_28500_version1_latestdraft.pdf\r
isPartOf: ${isPartOfV}\r
description: ${warcInfoDescription}\r
robots: ignore\r
http-header-user-agent: ${ua}\r\n`

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
const warcMetadataHeader = ({
  targetURI,
  now,
  concurrentTo,
  rid,
  len,
  wid
}) => `WARC/1.0\r
WARC-Type: metadata\r
WARC-Target-URI: ${targetURI}\r
WARC-Date: ${now}\r
WARC-Concurrent-To: <urn:uuid:${concurrentTo}>\r
WARC-Record-ID: <urn:uuid:${rid}>\r\
${wid ? `\nWARC-Warcinfo-ID: <urn:uuid:${wid}>\r` : ''}
Content-Type: application/warc-fields\r
Content-Length: ${len}\r\n`

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
const warcRequestHeader = ({
  targetURI,
  now,
  concurrentTo,
  rid,
  len,
  wid
}) => `WARC/1.0\r
WARC-Type: request\r
WARC-Target-URI: ${targetURI}\r
WARC-Date: ${now}\r
WARC-Concurrent-To: <urn:uuid:${concurrentTo}>\r
WARC-Record-ID: <urn:uuid:${rid}>\r\
${wid ? `\nWARC-Warcinfo-ID: <urn:uuid:${wid}>\r` : ''}
Content-Type: application/http; msgtype=request\r
Content-Length: ${len}\r\n`

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
const warcResponseHeader = ({ targetURI, now, rid, len, wid }) => `WARC/1.0\r
WARC-Type: response\r
WARC-Target-URI: ${targetURI}\r
WARC-Date: ${now}\r
WARC-Record-ID: <urn:uuid:${rid}>\r\
${wid ? `\nWARC-Warcinfo-ID: <urn:uuid:${wid}>\r` : ''}
Content-Type: application/http; msgtype=response\r
Content-Length: ${len}\r\n`

/**
 * @type {string}
 */
const CRLF = '\r\n'

/**
 * @type {string}
 */
const recordSeparator = `${CRLF}${CRLF}`

/**
 * @type {{warcHeader: function(headerInfo: WARCInfoHeader): string, warcHeaderContent: function(headerContent: WARCInfoContent): string, warcRequestHeader: function(requestHeader: WARCRequestHeader): string, warcResponseHeader: function(responseHeader: WARCResponseHeader): string, warcMetadataHeader: function(metadataHeader: WARCMetadataHeader): string, recordSeparator: string, CRLF: string}}
 */
module.exports = {
  warcHeader,
  warcHeaderContent,
  warcRequestHeader,
  warcResponseHeader,
  warcMetadataHeader,
  recordSeparator,
  CRLF
}
