'use strict'
const { SPACE } = require('../utils/constants')
const WFI = require('./fieldIdentifiers')

/**
 * @type {Buffer}
 */
const WARCVSlash = Buffer.from('/')

/**
 * @type {Buffer}
 */
const ColonSpace = Buffer.from(': ')

/**
 * @type {Buffer}
 */
const CRLF = WFI.crlf

/**
 *
 * @param {string} key
 * @param {*} value
 * @param {Map<string, *>} map
 */
function addMapKV (key, value, map) {
  const existingValue = map.get(key)
  if (existingValue) {
    if (Array.isArray(existingValue)) {
      existingValue.push(value)
    } else {
      map.set(key, [existingValue, value])
    }
  } else {
    map.set(key, value)
  }
}

/**
 * Utility class for parsing parts of WARC records
 */
class ContentParser {
  /**
   * Slices the supplied buffer returning a UTF-8 string
   * @param {Buffer} buf   - The buffer to slice
   * @param {number} start - The start position of the slice
   * @param {number} end   - The end position of the slice
   * @return {string}
   */
  static utf8BufferSlice (buf, start, end) {
    return buf
      .slice(start, end)
      .toString('utf8')
      .trim()
  }

  /**
   * Returns the index of the end of the supplied buffer that does not include `\r\n`
   * @param {Buffer} buf    - The buffer to receive the correct end index for
   * @param {number} bufLen - The full length of the buffer
   * @return {number}
   */
  static bufEndPosNoCRLF (buf, bufLen) {
    if (buf[bufLen - 2] === CRLF[0] && buf[bufLen - 1] === CRLF[1]) {
      return bufLen - 2
    }
    return bufLen
  }

  /**
   * Parses the HTTP information of WARC request and response records
   * @param {Buffer[]} bufs - Buffers containing the HTTP header information
   * @param {boolean} req   - Should the buffers be parsed as request or response
   * @returns {RequestHTTP|ResponseHTTP}
   */
  static parseHTTPPortion (bufs, req) {
    if (req) return ContentParser.parseReqHTTP(bufs)
    return ContentParser.parseResHTTP(bufs)
  }

  /**
   * Parse a WARC Records headers not HTTP Header parser
   * @param {Buffer[]} bufs - the WARC Records header lines
   * @return {Map<string, string|Array<string>>}
   */
  static parseWarcRecordHeader (bufs) {
    const rheader = new Map()
    let currentBuffer
    let curLen
    let sepPos
    for (let i = 0; i < bufs.length; ++i) {
      currentBuffer = bufs[i]
      curLen = currentBuffer.length
      sepPos = currentBuffer.indexOf(ColonSpace)
      if (sepPos !== -1) {
        addMapKV(
          ContentParser.utf8BufferSlice(currentBuffer, 0, sepPos),
          ContentParser.utf8BufferSlice(
            currentBuffer,
            sepPos + 2,
            ContentParser.bufEndPosNoCRLF(currentBuffer, curLen)
          ),
          rheader
        )
      } else {
        addMapKV(
          'WARC',
          ContentParser.utf8BufferSlice(
            currentBuffer,
            currentBuffer.indexOf(WARCVSlash) + 1,
            ContentParser.bufEndPosNoCRLF(currentBuffer, curLen)
          ),
          rheader
        )
      }
    }
    return rheader
  }

  /**
   * Parse a WARC Metadata records metadata content
   * @param {Buffer[]} bufs - the WARC Metadata records content lines
   * @return {Map<string, string|Array<string>>}
   */
  static parseWarcInfoMetaDataContent (bufs) {
    const content = new Map()
    let sepPos
    let currentBuffer
    let curLen
    for (let i = 0; i < bufs.length; ++i) {
      currentBuffer = bufs[i]
      curLen = currentBuffer.length
      sepPos = currentBuffer.indexOf(ColonSpace)
      if (sepPos !== -1) {
        addMapKV(
          ContentParser.utf8BufferSlice(currentBuffer, 0, sepPos),
          ContentParser.utf8BufferSlice(
            currentBuffer,
            sepPos + 2,
            ContentParser.bufEndPosNoCRLF(currentBuffer, curLen)
          ),
          content
        )
      } else {
        addMapKV(
          'unkeyed',
          ContentParser.utf8BufferSlice(
            currentBuffer,
            0,
            ContentParser.bufEndPosNoCRLF(currentBuffer, curLen)
          ),
          content
        )
      }
    }
    return content
  }

  /**
   * Parses the request HTTP headers
   * @param {Buffer[]} headerBuffs - the request HTTP headers
   * @return {RequestHTTP}
   */
  static parseReqHTTP (headerBuffs) {
    const content = {
      requestLine: null,
      path: null,
      method: null,
      httpVersion: null,
      headers: null
    }
    if (headerBuffs.length === 0) {
      return content
    }
    const currentBuffer = headerBuffs[0]
    const curLen = currentBuffer.length
    const requestLine = ContentParser.utf8BufferSlice(
      currentBuffer,
      0,
      ContentParser.bufEndPosNoCRLF(currentBuffer, curLen)
    )
    content.requestLine = requestLine
    let spaceIDX = requestLine.indexOf(SPACE)
    content.method = requestLine.substring(0, spaceIDX)
    const lastIDX = spaceIDX + 1
    spaceIDX = requestLine.indexOf(SPACE, lastIDX)
    content.path = requestLine.substring(lastIDX, spaceIDX)
    content.httpVersion = requestLine.substring(spaceIDX + 1)
    content.headers = ContentParser._parseHeaders(headerBuffs)
    return content
  }

  /**
   * Parses the response HTTP headers
   * @param {Buffer[]} headerBuffs - the response HTTP headers
   * @return {ResponseHTTP}
   */
  static parseResHTTP (headerBuffs) {
    const content = {
      statusLine: null,
      statusCode: null,
      statusReason: null,
      httpVersion: null,
      headers: null
    }
    if (headerBuffs.length === 0) {
      return content
    }
    const currentBuffer = headerBuffs[0]
    const curLen = currentBuffer.length
    const statusLine = ContentParser.utf8BufferSlice(
      currentBuffer,
      0,
      ContentParser.bufEndPosNoCRLF(currentBuffer, curLen)
    )
    content.statusLine = statusLine
    let spaceIDX = statusLine.indexOf(SPACE)
    content.httpVersion = statusLine.substring(0, spaceIDX)
    const lastIDX = spaceIDX + 1
    spaceIDX = statusLine.indexOf(SPACE, lastIDX)
    content.statusCode = statusLine.substring(lastIDX, spaceIDX)
    content.statusReason = statusLine.substring(spaceIDX + 1)
    content.headers = ContentParser._parseHeaders(headerBuffs)
    return content
  }

  /**
   * Parses an array of buffers containing HTTP headers
   * @param {Buffer[]} headerBuffs - The array of buffers representing HTTP headers
   * @return {Map<string, string|Array<string>>}
   * @private
   */
  static _parseHeaders (headerBuffs) {
    const headers = new Map()
    let key
    let lastKey = ''
    let sepPos
    let currentBuffer
    let curLen
    for (let i = 1; i < headerBuffs.length; ++i) {
      currentBuffer = headerBuffs[i]
      curLen = currentBuffer.length
      sepPos = currentBuffer.indexOf(ColonSpace)
      if (sepPos !== -1) {
        key = ContentParser.utf8BufferSlice(currentBuffer, 0, sepPos)
        lastKey = key
        addMapKV(
          key,
          ContentParser.utf8BufferSlice(
            currentBuffer,
            sepPos + 2,
            ContentParser.bufEndPosNoCRLF(currentBuffer, curLen)
          ),
          headers
        )
      } else {
        addMapKV(
          lastKey,
          ContentParser.utf8BufferSlice(
            currentBuffer,
            0,
            ContentParser.bufEndPosNoCRLF(currentBuffer, curLen)
          ),
          headers
        )
      }
    }
    return headers
  }
}

module.exports = ContentParser

/**
 * @typedef {Object} RequestHTTP
 * @property {?string} requestLine - The HTTP request line
 * @property {?string} path - The path of the request
 * @property {?string} method - The HTTP method used
 * @property {?string} httpVersion - The HTTP version
 * @property {?Map<string, string|Array<string>>} headers - The parsed headers
 */

/**
 * @typedef {Object} ResponseHTTP
 * @property {?string} statusLine - The HTTP response line
 * @property {?string} statusCode - The response code
 * @property {?string} statusReason - The status reason
 * @property {?string} httpVersion - The HTTP version
 * @property {?Map<string, string|Array<string>>} headers - The parsed headers
 */
