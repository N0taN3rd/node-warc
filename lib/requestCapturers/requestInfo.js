/** @ignore */
const {STATUS_CODES} = require('http')
/** @ignore */
const urlParse = require('url').parse
/** @ignore */
const startCase = require('lodash.startcase')
/** @ignore */
const isEmptyPlainObject = require('../utils/isEmptyPlainObject')
/** @ignore */
const {canReplayProtocols, SPACE, HTTP1D1, H2Method} = require(
  '../utils/constants')
const {CRLF} = require('../writers/warcFields')

/**
 * @desc Represents a request and response
 */
class RequestInfo {
  constructor () {
    /**
     * @type {?string}
     */
    this.url = undefined
    /**
     * @type {?string}
     */
    this.method = undefined
    /**
     * @type {?string}
     */
    this.protocol = undefined
    /**
     * @type {?string|?number}
     */
    this.status = undefined
    /**
     * @type {string}
     */
    this.statusText = undefined
    /**
     * @type {string}
     */
    this.postData = undefined
    /**
     * @type {?Object}
     */
    this.requestHeaders = undefined
    /**
     * @type {?Object}
     */
    this.requestHeaders_ = undefined
    /**
     * @type {string}
     */
    this.requestHeadersText = undefined
    /**
     * @type {?Object}
     */
    this.responseHeaders = undefined
    /**
     * @type {string}
     */
    this.responseHeadersText = undefined
    /**
     * @type {boolean}
     */
    this.getBody = false
    /**
     * @type {boolean}
     */
    this.hasPostData = false
  }

  /**
   * @desc Create a new RequestInfo from a request
   * @param {Object} info
   * @return {RequestInfo}
   */
  static fromRequest (info) {
    const cr = new RequestInfo()
    cr.requestId = info.requestId
    cr.url = info.request.url
    cr.method = info.request.method
    cr.requestHeaders_ = info.request.headers
    cr.postData = info.request.postData
    cr.hasPostData = info.request.hasPostData
    return cr
  }

  /**
   * @desc Create a new RequestInfo from a request that redirected
   * @param {Object} info
   * @return {RequestInfo}
   */
  static fromRedir (info) {
    const redirCR = new RequestInfo()
    redirCR.requestId = info.requestId
    redirCR.url = info.redirectResponse.url
    redirCR.method = info.request.method
    redirCR.requestHeaders = info.redirectResponse.requestHeaders
    redirCR.requestHeadersText = info.redirectResponse.requestHeadersText
    redirCR.responseHeaders = info.redirectResponse.headers
    redirCR.responseHeadersText = info.redirectResponse.headersText
    redirCR.status = info.redirectResponse.status
    redirCR.statusText = info.redirectResponse.statusText
    redirCR.protocol = redirCR._correctProtocol(info.redirectResponse.protocol)
    redirCR._checkMethod()
    return redirCR
  }

  /**
   * @desc Create a new RequestInfo from a response
   * @param {Object} info
   * @return {RequestInfo}
   */
  static fromResponse (info) {
    const cr = new RequestInfo()
    cr.requestId = info.requestId
    cr.url = info.response.url
    cr.requestHeaders = info.response.requestHeaders
    cr.requestHeadersText = info.response.requestHeadersText
    cr.responseHeaders = info.response.headers
    cr.responseHeadersText = info.response.headersText
    cr.status = info.response.status
    cr.statusText = info.response.statusText
    cr.protocol = cr._correctProtocol(info.response.protocol)
    cr.getBody = true
    cr._checkMethod()
    return cr
  }

  /**
   * @desc Add the requests response information
   * @param {Object} res
   * @param {boolean} [not3xx=true]
   */
  addResponse (res, not3xx = true) {
    this.url = this.url || res.url
    this.requestHeaders = res.requestHeaders
    this.requestHeadersText = res.requestHeadersText
    this.responseHeaders = res.headers
    this.responseHeadersText = res.headersText
    this.status = res.status
    this.statusText = res.statusText
    this.protocol = this._correctProtocol(res.protocol)
    this.getBody = not3xx
    this._checkMethod()
  }

  /**
   * @desc Serialize the request headers for the WARC entry
   * @return {string}
   */
  serializeRequestHeaders () {
    let outString
    let purl = urlParse(this.url)
    if (this.requestHeadersText) {
      let lines = this.requestHeadersText.split(CRLF)
      let protoTest = lines[0].split(' ')
      outString = `${protoTest[0]} ${protoTest[1]} ${this.protocol} ${CRLF}`
      let i = 1
      let haveHost = false
      let host = `Host: ${purl.host}`
      let len = lines.length - 2
      while (i < len) {
        outString += `${lines[i]}${CRLF}`
        if (host === lines[i]) {
          haveHost = true
        }
        i++
      }
      if (!haveHost) {
        outString += `${host}${CRLF}`
      }
      outString += CRLF
    } else {
      if (this.protocol === undefined) {
        this.protocol = HTTP1D1
      }
      let urlPath = purl.path
      if (purl.hash !== null) {
        urlPath += purl.hash
      }
      if (!isEmptyPlainObject(this.requestHeaders)) {
        outString = `${this.method} ${urlPath} ${this.protocol}${CRLF}`
        if (!(this.requestHeaders.host || this.requestHeaders.Host)) {
          this.requestHeaders['Host'] = purl.host
        }
        for (let headKey in this.requestHeaders) {
          outString += `${
            startCase(headKey).split(SPACE).join('-')
          }: ${this.requestHeaders[headKey]}${CRLF}`
        }
        outString += CRLF
      } else if (!isEmptyPlainObject(this.requestHeaders_)) {
        outString = `${this.method} ${urlPath} ${this.protocol}${CRLF}`
        if (!(this.requestHeaders_.host || this.requestHeaders_.Host)) {
          this.requestHeaders_['Host'] = purl.host
        }
        for (let headKey in this.requestHeaders_) {
          outString += `${
            startCase(headKey).split(SPACE).join('-')
          }: ${this.requestHeaders_[headKey]}${CRLF}`
        }
        outString += CRLF
      } else {
        if (this.protocol === undefined) {
          this.protocol = HTTP1D1
        }
        if (this.method === undefined) {
          this.method = 'GET'
        }
        outString = `${this.method} ${urlPath} ${this.protocol}${CRLF}`
        outString += `Host: ${purl.host}${CRLF}${CRLF}`
      }
    }
    return outString
  }

  /**
   * @desc Serialize the response headers for the WARC entry
   * @return {string}
   */
  serializeResponseHeaders () {
    let outString
    if (this.responseHeadersText !== undefined) {
      let lines = this.responseHeadersText.split(CRLF)
      let [proto, status, ...rest] = lines[0].split(SPACE)
      if (!canReplayProtocols.has(proto)) {
        if (rest.length === 0) {
          outString = `HTTP/1.1 ${status} ${STATUS_CODES[+status]}${CRLF}`
        } else {
          outString = `HTTP/1.1 ${status} ${rest.join(SPACE)}${CRLF}`
        }
      } else {
        if (rest.length === 0) {
          outString = `${proto} ${status} ${STATUS_CODES[+status]}${CRLF}`
        } else {
          outString = `${proto} ${status} ${rest.join(SPACE)}${CRLF}`
        }
      }
      let i = 1
      let len = lines.length - 2
      while (i < len) {
        outString += `${lines[i]}${CRLF}`
        i++
      }
      outString += CRLF
    } else if (!isEmptyPlainObject(this.responseHeaders)) {
      if (!this.statusText) {
        this.statusText = STATUS_CODES[this.status]
      }
      outString = `${this.protocol} ${this.status} ${this.statusText}${CRLF}`
      let headerKeys = Object.keys(this.responseHeaders)
      for (let i = 0; i < headerKeys.length; ++i) {
        outString += `${
          startCase(headerKeys[i]).split(SPACE).join('-')
        }: ${this.responseHeaders[headerKeys[i]]}${CRLF}`
      }
      outString += CRLF
    }
    return outString
  }

  /**
   * @desc Determine if we have enough information to serialize the response
   * @return {boolean}
   */
  canSerializeResponse () {
    if (this.url.indexOf('data:') === 0) return false
    if (this.responseHeadersText !== undefined) return true
    return (
      this.status !== undefined &&
      this.protocol !== undefined &&
      !isEmptyPlainObject(this.responseHeaders)
    )
  }

  /**
   * @desc Ensure that the request info object has its method property set
   * @private
   */
  _checkMethod () {
    if (!this.method) {
      let good = false
      if (this.responseHeaders) {
        let maybeMeth = this.responseHeaders[H2Method]
        if (maybeMeth) {
          this.method = maybeMeth
          good = true
        }
      }
      if (!good && this.requestHeadersText) {
        this._methProtoFromReqHeadText(this.responseHeadersText)
      }
    }
  }

  /**
   * @desc Set The Requests Method And Protocol From The Request Headers Text
   * @param {?string} requestHeadersText The Full HTTP Headers String
   * @private
   */
  _methProtoFromReqHeadText (requestHeadersText) {
    if (requestHeadersText) {
      let httpString = requestHeadersText.substr(0,
        requestHeadersText.indexOf(CRLF))
      if (httpString) {
        let httpStringParts = httpString.split(SPACE)
        if (httpStringParts) {
          this.method = httpStringParts[0]
          if (!this.protocol) {
            this.protocol = this._correctProtocol(httpStringParts[2])
          }
        }
      }
    }
  }

  /**
   * @desc Ensure that the request info object has the correct protocol property
   * @param {string} originalProtocol
   * @return {string}
   * @private
   */
  _correctProtocol (originalProtocol) {
    let newProtocol
    if (originalProtocol) {
      newProtocol = originalProtocol.toUpperCase()
      newProtocol = canReplayProtocols.has(newProtocol) ? newProtocol : HTTP1D1
    } else {
      newProtocol = HTTP1D1
    }
    if (!this.protocol) {
      this.protocol = newProtocol
    }
    return newProtocol
  }
}

module.exports = RequestInfo
