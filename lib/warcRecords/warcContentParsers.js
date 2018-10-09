'use strict'

const WARCVSlash = Buffer.from('/')
const ColonSpace = Buffer.from(': ')
const trailer = Buffer.from('\r\n')

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
  static bufEndPosNoTrailers (buf, bufLen) {
    if (buf[bufLen - 2] === trailer[0] && buf[bufLen - 1] === trailer[1]) {
      return bufLen - 2
    }
    return bufLen
  }

  static parseHTTPPortion (bufs, res) {
    if (res) return Parser.parseResHTTP(bufs)
    return Parser.parseReqHTTP(bufs)
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
          Parser.bufEndPosNoTrailers(currentBuffer, curLen)
        )
        rheader[headerKey] = headerValue
      } else {
        rheader['WARC'] = Parser.utf8BufferSlice(
          currentBuffer,
          currentBuffer.indexOf(WARCVSlash) + 1,
          Parser.bufEndPosNoTrailers(currentBuffer, curLen)
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
          Parser.bufEndPosNoTrailers(currentBuffer, curLen)
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
          Parser.bufEndPosNoTrailers(currentBuffer, curLen)
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
    let reqSplit
    let currentBuffer = headerBuffs[0]
    let curLen = currentBuffer.length
    content.requestLine = Parser.utf8BufferSlice(
      currentBuffer,
      0,
      Parser.bufEndPosNoTrailers(currentBuffer, curLen)
    )
    reqSplit = content.requestLine.split(' ')
    content.method = reqSplit[0]
    content.path = reqSplit[1]
    content.httpVersion = reqSplit[2]
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
    let reqSplit
    let currentBuffer = headerBuffs[0]
    let curLen = currentBuffer.length
    content.statusLine = Parser.utf8BufferSlice(
      currentBuffer,
      0,
      Parser.bufEndPosNoTrailers(currentBuffer, curLen)
    )
    reqSplit = content.statusLine.split(' ')
    content.httpVersion = reqSplit[0]
    content.statusCode = reqSplit[1]
    content.statusReason = reqSplit[2]
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
          Parser.bufEndPosNoTrailers(currentBuffer, curLen)
        )
      } else {
        headers[lastKey] = Parser.utf8BufferSlice(
          currentBuffer,
          0,
          Parser.bufEndPosNoTrailers(currentBuffer, curLen)
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
