/** @ignore */
const {parseWarcInfoMetaDataContent, parseWarcRecordHeader, headerRe} = require('./warcContentParsers')

/**
 * @desc WARC-TYPE: warcinfo
 */
class WARCInfoRecord {
  /**
   * @desc Create a new WARCInfoRecord
   * @param {Buffer[]} headerBuffers the warc header fields
   * @param {Buffer[]} contentBuffers the warc records contents
   */
  constructor (headerBuffers, contentBuffers) {
    /**
     * @type {Object}
     */
    this.warcHeader = parseWarcRecordHeader(headerBuffers)

    /**
     * @type {Object}
     */
    this.content = parseWarcInfoMetaDataContent(contentBuffers)

    /**
     * @type {string}
     */
    this.type = 'warcinfo'
  }

  /**
   * @return {string} WARC-TYPE
   */
  get warcType () {
    return this.warcHeader['WARC-Type']
  }

  /**
   * @return {string} WARC-Filename
   */
  get warcFilename () {
    return this.warcHeader['WARC-Filename']
  }

  /**
   * @return {string} WARC-Record-ID
   */
  get recordId () {
    return this.warcHeader['WARC-Record-ID']
  }

  /**
   * @return {string} WARC-HEADER:Content-Type
   */
  get warcContentType () {
    return this.warcHeader['Content-Type']
  }

  /**
   * @return {number} WARC-HEADER:Content-Length
   */
  get warcContentLength () {
    return this.warcHeader['Content-Length']
  }
}

/**
 * @desc WARC-TYPE: metadata
 */
class WARCMetaDataRecord {
  /**
   * @desc Create a new WARCMetaDataRecord
   * @param {Buffer[]} headerBuffers the warc header fields
   * @param {Buffer[]} contentBuffers the warc records contents
   */
  constructor (headerBuffers, contentBuffers) {
    /**
     * @type {Object}
     */
    this.warcHeader = parseWarcRecordHeader(headerBuffers)

    /**
     * @type {Object}
     */
    this.content = parseWarcInfoMetaDataContent(contentBuffers)

    /**
     * @type {string}
     */
    this.type = 'metadata'
  }

  /**
   * @return {string} WARC-TYPE
   */
  get warcType () {
    return this.warcHeader['WARC-Type']
  }

  /**
   * @return {string} WARC-Record-ID
   */
  get recordId () {
    return this.warcHeader['WARC-Record-ID']
  }

  /**
   * @return {string} WARC-Concurrent-To
   */
  get concurrentTo () {
    return this.warcHeader['WARC-Concurrent-To']
  }

  /**
   * @return {string} WARC-HEADER:Content-Type
   */
  get warcContentType () {
    return this.warcHeader['Content-Type']
  }

  /**
   * @return {number} WARC-HEADER:Content-Length
   */
  get warcContentLength () {
    return this.warcHeader['Content-Length']
  }
}

/**
 * @desc WARC-TYPE: request
 */
class WARCRequestRecord {
  /**
   * @desc Create a new WARCRequestRecord
   * @param {Buffer[]} headerBuffers
   * @param {Buffer[]} httpBuffers
   * @param {Buffer[]} postBuffers
   */
  constructor (headerBuffers, httpBuffers, postBuffers) {
    /**
     * @type {string}
     */
    this.type = 'request'

    /**
     * @type {?string}
     */
    this.method = null

    /**
     * @type {?string}
     */
    this.requestLine = null

    /**
     * @type {?string}
     */
    this.httpVersion = null

    /**
     * @type {Object}
     */
    this.warcHeader = parseWarcRecordHeader(headerBuffers)

    /**
     * @type {Object}
     */
    this.httpHeaders = this._parseHttpHeaders(httpBuffers)

    if (this.method && this.method.toLowerCase() === 'post') {
      /**
       * @desc The post data of the request. This property is only on a {@link WARCRequestRecord} if it corresponds to
       * a post request
       * @type {Buffer}
       */
      this.postBuffer = Buffer.concat(postBuffers)
    }
  }

  /**
   * @desc Parses the request HTTP headers
   * @param {Buffer[]} bufs the request HTTP headers
   * @return {Object}
   * @private
   */
  _parseHttpHeaders (bufs) {
    if (bufs.length === 0) {
      return {}
    }
    let content = {}
    let len = bufs.length
    let i = 1
    let line
    let match
    // console.log(bufs[0].toString('utf8').trim())
    this.requestLine = bufs[0].toString('utf8').trim()
    // disabling eslint to account for ES6 array destructuring
    let [meth, path, httpV] = this.requestLine.split(' ') // eslint-disable-line
    this.method = meth
    this.httpVersion = httpV
    let lastMatch
    for (; i < len; ++i) {
      line = bufs[i].toString('utf8').trim()
      match = headerRe.exec(line)
      if (match) {
        let [_, m1, m2] = match // eslint-disable-line
        content[m1] = m2
        lastMatch = m1
      } else {
        // because really long set cookie and friends
        if (lastMatch) {
          content[lastMatch] += line
        } else {
          console.log('boooo WarcRequestRecord._parseHeaders', line)
        }
      }
    }
    return content
  }

  /**
   * @return {string} WARC-Record-ID
   */
  get recordId () {
    return this.warcHeader['WARC-Record-ID']
  }

  /**
   * @return {string} WARC-Target-URI
   */
  get targetURI () {
    return this.warcHeader['WARC-Target-URI']
  }

  /**
   * @return {string} WARC-HEADER:Content-Type
   */
  get warcContentType () {
    return this.warcHeader['Content-Type']
  }

  /**
   * @return {number} WARC-HEADER:Content-Length
   */
  get warcContentLength () {
    return this.warcHeader['Content-Length']
  }
}

/**
 * @desc WARC-TYPE: response
 */
class WARCResponseRecord {
  /**
   * @desc Create a new WARCResponseRecord
   * @param {Buffer[]} headerBuffers
   * @param {Buffer[]} httpBuffers
   * @param {Buffer[]} bodyBuffers
   */
  constructor (headerBuffers, httpBuffers, bodyBuffers) {
    /**
     * @type {?number}
     */
    this.statusCode = null

    /**
     * @type {?string}
     */
    this.statusReason = null

    /**
     * @type {?string}
     */
    this.statusLine = null

    /**
     * @type {?string}
     */
    this.httpVersion = null

    /**
     * @type {Object}
     */
    this.warcHeader = parseWarcRecordHeader(headerBuffers)

    if (this.warcContentType === 'text/dns') {
      /**
       * @type {Object}
       */
      this.httpHeaders = {}

      /**
       * @type {?Buffer|?string[]}
       */
      this.bodyBuffer = httpBuffers.map(it => it.toString())
    } else {
      /**
       * @type {Object}
       */
      this.httpHeaders = this._parseHttpHeaders(httpBuffers)

      /**
       * @type {?Buffer|?string[]}
       */
      this.bodyBuffer = Buffer.concat(bodyBuffers || [])
    }

    /**
     * @type {string}
     */
    this.type = 'response'
  }

  /**
   * @desc Parses the response HTTP headers
   * @param {Buffer[]} bufs the response HTTP headers
   * @return {Object}
   * @private
   */
  _parseHttpHeaders (bufs) {
    if (bufs.length === 0) {
      return {}
    }
    let content = {}
    let len = bufs.length
    let i = 1
    let line
    let match
    this.statusLine = bufs[0].toString('utf8').trim()
    let [httpV, statusCode, statusReason] = this.statusLine.split(' ')
    this.statusCode = parseInt(statusCode)
    this.statusReason = statusReason
    this.httpVersion = httpV
    let lastMatch
    for (; i < len; ++i) {
      line = bufs[i].toString('utf8').trim()
      match = headerRe.exec(line)
      if (match) {
        // disabling eslint to account for ES6 array destructuring
        let [_, m1, m2] = match // eslint-disable-line
        if (m1.toLowerCase() === 'content-length') {
          content[m1] = parseInt(m2)
        } else {
          content[m1] = m2
        }
        lastMatch = m1
      } else {
        // because really long set cookie and friends
        if (lastMatch) {
          content[lastMatch] += line
        } else {
          console.log('boooo WarcResponseRecord._parseHeaders', this.warcContentType, line)
        }
      }
    }
    return content
  }

  /**
   * @return {string} WARC-Record-ID
   */
  get recordId () {
    return this.warcHeader['WARC-Record-ID']
  }

  /**
   * @return {string} WARC-Target-URI
   */
  get targetURI () {
    return this.warcHeader['WARC-Target-URI']
  }

  /**
   * @return {string} WARC-HEADER:Content-Type
   */
  get warcContentType () {
    return this.warcHeader['Content-Type']
  }

  /**
   * @return {number} WARC-HEADER:Content-Length
   */
  get warcContentLength () {
    return this.warcHeader['Content-Length']
  }
}

/**
 * @desc WARC-TYPE: revisit
 */
class WARCRevisitRecord {
  /**
   * @desc Create a new WARCResponseRecord
   * @param {Buffer[]} headerBuffers
   * @param {Buffer[]} httpBuffers
   */
  constructor (headerBuffers, httpBuffers) {
    /**
     * @type {string}
     */
    this.type = 'revisit'

    /**
     * @type {?number}
     */
    this.statusCode = null

    /**
     * @type {?string}
     */
    this.statusReason = null

    /**
     * @type {?string}
     */
    this.statusLine = null

    /**
     * @type {?string}
     */
    this.httpVersion = null

    /**
     * @type {Object}
     */
    this.warcHeader = parseWarcRecordHeader(headerBuffers)

    /**
     * @type {Object}
     */
    this.httpHeaders = this._parseHttpHeaders(httpBuffers)
  }

  /**
   * @desc Parses the response HTTP headers
   * @param {Buffer[]} bufs the response HTTP headers
   * @return {Object}
   * @private
   */
  _parseHttpHeaders (bufs) {
    if (bufs.length === 0) {
      return {}
    }
    let content = {}
    let len = bufs.length
    let i = 1
    let line
    let match
    // console.log(fl)
    this.statusLine = bufs[0].toString('utf8').trim()
    let [httpV, statusCode, statusReason] = this.statusLine.split(' ')
    this.statusCode = parseInt(statusCode)
    this.statusReason = statusReason
    this.httpVersion = httpV
    let lastMatch
    for (; i < len; ++i) {
      line = bufs[i].toString('utf8').trim()
      match = headerRe.exec(line)
      if (match) {
        // disabling eslint to account for ES6 array destructuring
        let [_, m1, m2] = match // eslint-disable-line
        if (m1.toLowerCase() === 'content-length') {
          content[m1] = parseInt(m2)
        } else {
          content[m1] = m2
        }
        lastMatch = m1
      } else {
        // because really long set cookie and friends
        if (lastMatch) {
          content[lastMatch] += line
        } else {
          console.log('boooo WARCRevisitRecord._parseHeaders', this.warcContentType, line)
        }
      }
    }
    return content
  }

  /**
   * @return {string} WARC-Record-ID
   */
  get recordId () {
    return this.warcHeader['WARC-Record-ID']
  }

  /**
   * @return {string} WARC-Target-URI
   */
  get targetURI () {
    return this.warcHeader['WARC-Target-URI']
  }

  /**
   * @return {string} WARC-HEADER:Content-Type
   */
  get warcContentType () {
    return this.warcHeader['Content-Type']
  }

  /**
   * @return {number} WARC-HEADER:Content-Length
   */
  get warcContentLength () {
    return this.warcHeader['Content-Length']
  }
}

/**
 * @desc This class is this libraries attempt at being lenient about parsing.
 */
class WARCResourceRecord {
  /**
   * @desc Create a new WARCResponseRecord
   * @param {Buffer[]} headerBuffers
   * @param {Buffer[]} contentBuffers
   */
  constructor (headerBuffers, contentBuffers) {
    /**
     * @type {Object}
     */
    this.warcHeader = parseWarcRecordHeader(headerBuffers)

    /**
     * @type {Buffer}
     */
    this.contentBuffers = Buffer.concat(contentBuffers)

    /**
     * @type {string}
     */
    this.type = 'resource'
  }
}

/**
 * @desc This class is this libraries attempt at being lenient about parsing.
 * This class is only used if this library cannot automatically correct the common ``off by one`` error
 * other WARC parsing libraries stop immediately at when encountered (especially during indexing).
 *
 * This library knows does not think missing a single ``CTRL-LF`` should stop you from reading a WARC
 *
 * Now if something went terribly wrong during WARC creation that's on you but we still think you should know about it by having
 * as much of that messed up data as we can parse before moving on to the next record.
 */
class WARCUnknownRecord {
  /**
   * @desc Create a new WARCResponseRecord
   * @param {Buffer[]} headerBuffers
   * @param {Buffer[]} otherBuffers
   */
  constructor (headerBuffers, ...otherBuffers) {
    /**
     * @type {Object}
     */
    this.warcHeader = parseWarcRecordHeader(headerBuffers)

    /**
     * @type {Buffer[][]}
     */
    this.otherBuffers = otherBuffers

    /**
     * @type {string}
     */
    this.type = 'unknown'
  }
}

module.exports = {
  WARCInfoRecord,
  WARCMetaDataRecord,
  WARCRequestRecord,
  WARCResponseRecord,
  WARCRevisitRecord,
  WARCUnknownRecord,
  WARCResourceRecord
}
