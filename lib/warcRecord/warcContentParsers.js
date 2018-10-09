'use strict'

const { SPACE } = require('../utils/constants')
const WFI = require('./fieldIdentifiers')
const WARCVSlash = Buffer.from('/')
const ColonSpace = Buffer.from(': ')

const CRLF = WFI.crlf

class Parser {
  /**
   *
   * @param {Buffer} buf
   * @param {number} start
   * @param {number} end
   * @return {string}
   */
  static utf8BufferSlice (buf, start, end) {
    return buf.slice(start, end).toString('utf8')
  }

  /**
   *
   * @param {Buffer} buf
   * @param {number} bufLen
   * @return {number}
   */
  static bufEndPosNoCRLF (buf, bufLen) {
    if (buf[bufLen - 2] === CRLF[0] && buf[bufLen - 1] === CRLF[1]) {
      return bufLen - 2
    }
    return bufLen
  }

  static parseHTTPPortion (bufs, req) {
    if (req) return Parser.parseReqHTTP(bufs)
    return Parser.parseResHTTP(bufs)
  }

  /**
   * @desc Parse a WARC Records headers not HTTP Header parser
   * @param {Buffer[]} bufs the WARC Records _header lines
   * @return {Object}
   */
  static parseWarcRecordHeader (bufs) {
    let rheader = {}
    let len = bufs.length
    let i = 0
    let currentBuffer
    let curLen
    let sepPos
    let headerKey
    let headerValue
    while (i < len) {
      currentBuffer = bufs[i]
      curLen = currentBuffer.length
      sepPos = currentBuffer.indexOf(ColonSpace)
      if (sepPos !== -1) {
        headerKey = Parser.utf8BufferSlice(currentBuffer, 0, sepPos)
        headerValue = Parser.utf8BufferSlice(
          currentBuffer,
          sepPos + 2,
          Parser.bufEndPosNoCRLF(currentBuffer, curLen)
        )
        rheader[headerKey] = headerValue
      } else {
        rheader['WARC'] = Parser.utf8BufferSlice(
          currentBuffer,
          currentBuffer.indexOf(WARCVSlash) + 1,
          Parser.bufEndPosNoCRLF(currentBuffer, curLen)
        )
      }
      i++
    }
    return rheader
  }

  /**
   * @desc Parse a WARC Metadata records metadata content
   * @param {Buffer[]} bufs the WARC Metadata records content lines
   * @return {Object}
   */
  static parseWarcInfoMetaDataContent (bufs) {
    let content = {}
    let len = bufs.length
    let i = 0
    let sepPos
    let key
    let value
    let currentBuffer
    let curLen
    while (i < len) {
      currentBuffer = bufs[i]
      curLen = currentBuffer.length
      sepPos = currentBuffer.indexOf(ColonSpace)
      if (sepPos !== -1) {
        key = Parser.utf8BufferSlice(currentBuffer, 0, sepPos)
        value = Parser.utf8BufferSlice(
          currentBuffer,
          sepPos + 2,
          Parser.bufEndPosNoCRLF(currentBuffer, curLen)
        )
        if (key === 'outlink') {
          if (content.outlink == null) {
            content.outlink = []
          }
          content.outlink.push(value)
        } else {
          content[key] = value
        }
      } else {
        value = Parser.utf8BufferSlice(
          currentBuffer,
          0,
          Parser.bufEndPosNoCRLF(currentBuffer, curLen)
        )
        if (content.unkeyed == null) {
          content.unkeyed = []
        }
        content.unkeyed.push(value)
      }
      i++
    }
    return content
  }

  /**
   * @desc Parses the request HTTP headers
   * @param {Buffer[]} headerBuffs the request HTTP headers
   * @return {Object}
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
    let currentBuffer = headerBuffs[0]
    let curLen = currentBuffer.length
    let requestLine = Parser.utf8BufferSlice(
      currentBuffer,
      0,
      Parser.bufEndPosNoCRLF(currentBuffer, curLen)
    )
    content.requestLine = requestLine
    let spaceIDX = requestLine.indexOf(SPACE)
    content.method = requestLine.substring(0, spaceIDX)
    let lastIDX = spaceIDX + 1
    spaceIDX = requestLine.indexOf(SPACE, lastIDX)
    content.path = requestLine.substring(lastIDX, spaceIDX)
    content.httpVersion = requestLine.substring(spaceIDX + 1)
    content.headers = Parser._parseHeaders(headerBuffs)
    return content
  }

  /**
   * @desc Parses the response HTTP headers
   * @param {Buffer[]} headerBuffs the response HTTP headers
   * @return {Object}
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
    let currentBuffer = headerBuffs[0]
    let curLen = currentBuffer.length
    let statusLine = Parser.utf8BufferSlice(
      currentBuffer,
      0,
      Parser.bufEndPosNoCRLF(currentBuffer, curLen)
    )
    content.statusLine = statusLine
    let spaceIDX = statusLine.indexOf(SPACE)
    content.httpVersion = statusLine.substring(0, spaceIDX)
    let lastIDX = spaceIDX + 1
    spaceIDX = statusLine.indexOf(SPACE, lastIDX)
    content.statusCode = statusLine.substring(lastIDX, spaceIDX)
    content.statusReason = statusLine.substring(spaceIDX + 1)
    content.headers = Parser._parseHeaders(headerBuffs)
    return content
  }

  /**
   * @desc
   * @param {Buffer[]} headerBuffs
   * @return {Object}
   * @private
   */
  static _parseHeaders (headerBuffs) {
    const headers = {}
    let len = headerBuffs.length
    let i = 1
    let key
    let lastKey = ''
    let sepPos
    let currentBuffer
    let curLen
    while (i < len) {
      currentBuffer = headerBuffs[i]
      curLen = currentBuffer.length
      sepPos = currentBuffer.indexOf(ColonSpace)
      if (sepPos !== -1) {
        key = Parser.utf8BufferSlice(currentBuffer, 0, sepPos)
        lastKey = key
        headers[key] = Parser.utf8BufferSlice(
          currentBuffer,
          sepPos + 2,
          Parser.bufEndPosNoCRLF(currentBuffer, curLen)
        )
      } else {
        headers[lastKey] = Parser.utf8BufferSlice(
          currentBuffer,
          0,
          Parser.bufEndPosNoCRLF(currentBuffer, curLen)
        )
      }
      i++
    }
    return headers
  }
}

/**
 * @type {Parser}
 */
module.exports = Parser
