const { STATUS_CODES } = require('http')
const { URL } = require('url')
const {
  canReplayProtocols,
  SPACE,
  HTTP1D1,
  H2Method
} = require('../utils/constants')
const { CRLF } = require('../writers/warcFields')
const { stringifyHeaders } = require('../utils/headerSerializers')

/**
 * @type {string}
 */
const HeaderTrailers = `${CRLF}${CRLF}`

/**
 * @desc Represents a request and response
 */
class CDPRequestInfo {
  /**
   * @desc Construct a new CDPRequestInfo
   */
  constructor () {
    /**
     * @desc The id of the request
     * @type {?string}
     */
    this.requestId = undefined

    /**
     * @desc The URL of the request. May not contain the fragment
     * portion of the the URL if it had a fragment depending on if the
     * representation of URL returned by the CDP separates it.
     * @type {?string}
     */
    this._url = undefined

    /**
     * @desc The fragment portion of the requests URL.
     * Only defined if representation of the URL returned by the CDP
     * has this property.
     * @type {?string}
     */
    this.urlFragment = undefined

    /**
     * @desc The HTTP method used to make this request
     * @type {?string}
     */
    this.method = undefined

    /**
     * @desc The HTTP protocol used to make this request
     * @type {?string}
     */
    this.protocol = undefined

    /**
     * @desc The HTTP status of the response
     * @type {string|number}
     */
    this.status = undefined

    /**
     * @desc The HTTP status reasons text of the response
     * @type {string}
     */
    this.statusText = undefined

    /**
     * @desc The post data of the request if any was sent
     * @type {?string}
     */
    this.postData = undefined

    /**
     * @desc The request HTTP headers object on the CDP Response object
     * @type {?Object}
     */
    this.requestHeaders = undefined

    /**
     * @desc The request HTTP headers object on the CDP Request object
     * @type {?Object}
     */
    this.requestHeaders_ = undefined

    /**
     * @desc The raw request HTTP header string on the CDP Response object
     * @type {string}
     */
    this.requestHeadersText = undefined

    /**
     * @desc The response HTTP header object on the CDP Response object
     * @type {?Object}
     */
    this.responseHeaders = undefined

    /**
     * @desc The raw response HTTP header string on the CDP Response object
     * @type {string}
     */
    this.responseHeadersText = undefined

    /**
     * @desc Boolean indicating if the response body should be retrieved
     * @type {boolean}
     */
    this.getBody = false

    /**
     * @desc Boolean indicating if the requests post data should be retrieved
     * @type {boolean}
     */
    this.hasPostData = false
  }

  /**
   * @desc Create a new RequestInfo from a request
   * @param {Object} info - The object received from Network.requestWillBeSent
   * @return {CDPRequestInfo}
   */
  static fromRequest (info) {
    const cr = new CDPRequestInfo()
    cr.requestId = info.requestId
    cr._url = info.request.url
    cr.urlFragment = info.request.urlFragment
    cr.method = info.request.method
    cr.requestHeaders_ = info.request.headers
    cr.postData = info.request.postData
    cr.hasPostData = info.request.hasPostData
    return cr
  }

  /**
   * @desc Create a new RequestInfo from a request that redirected
   * @param {Object} info - The object received from Network.requestWillBeSent
   * @return {CDPRequestInfo}
   */
  static fromRedir (info) {
    const redirCR = new CDPRequestInfo()
    redirCR.requestId = info.requestId
    redirCR._url = info.redirectResponse.url
    redirCR.method = info.request.method
    redirCR.requestHeaders = info.redirectResponse.requestHeaders
    redirCR.requestHeadersText = info.redirectResponse.requestHeadersText
    redirCR.responseHeaders = info.redirectResponse.headers
    redirCR.responseHeadersText = info.redirectResponse.headersText
    redirCR.status = info.redirectResponse.status
    redirCR.statusText = info.redirectResponse.statusText
    redirCR.protocol = info.redirectResponse.protocol
    return redirCR
  }

  /**
   * @desc Create a new RequestInfo from a response
   * @param {Object} info - The object received from Network.responseReceived
   * @return {CDPRequestInfo}
   */
  static fromResponse (info) {
    const cr = new CDPRequestInfo()
    cr.requestId = info.requestId
    cr._url = info.response.url
    cr.requestHeaders = info.response.requestHeaders
    cr.requestHeadersText = info.response.requestHeadersText
    cr.responseHeaders = info.response.headers
    cr.responseHeadersText = info.response.headersText
    cr.status = info.response.status
    cr.statusText = info.response.statusText
    cr.protocol = info.response.protocol
    cr.getBody = true
    return cr
  }

  /**
   * @desc Add the requests response information
   * @param {Object} res - The response object received from Network.responseReceived
   * @param {boolean} [not3xx=true]
   */
  addResponse (res, not3xx = true) {
    this._url = this._url || res.url
    this.requestHeaders = res.requestHeaders
    this.requestHeadersText = res.requestHeadersText
    this.responseHeaders = res.headers
    this.responseHeadersText = res.headersText
    this.status = res.status
    this.statusText = res.statusText
    this.protocol = res.protocol
    this.getBody = not3xx
  }

  /**
   * @return {string}
   */
  get url () {
    return this.urlFragment != null ? this._url + this.urlFragment : this._url
  }

  /**
   * @desc Returns a URL object representing this requests URL
   * @return {URL}
   */
  getParsedURL () {
    return new URL(this.url)
  }

  /**
   * @desc Returns the request headers text that is replay able
   * @return {string}
   * @private
   */
  _serializeRequestHeadersText () {
    const fcrlfidx = this.requestHeadersText.indexOf(CRLF)
    let fline = this.requestHeadersText.substring(0, fcrlfidx)
    const rest = this.requestHeadersText.substring(fcrlfidx)
    const protocol = fline.substring(fline.lastIndexOf(SPACE) + 1)
    if (!canReplayProtocols.has(protocol)) {
      fline = fline.replace(protocol, HTTP1D1)
    }
    const trailers = rest.substring(rest.length - 4)
    return trailers === HeaderTrailers ? fline + rest : fline + rest + CRLF
  }

  /**
   * @desc Returns the correct request header object or null if there is none
   * @return {?Object}
   * @private
   */
  _getReqHeaderObj () {
    if (this.requestHeaders != null) {
      return this.requestHeaders
    }
    if (this.requestHeaders_ != null) {
      return this.requestHeaders_
    }
    return null
  }

  /**
   * @private
   */
  _ensureProto () {
    if (
      this.protocol == null ||
      !canReplayProtocols.has(this.protocol.toUpperCase())
    ) {
      this.protocol = HTTP1D1
    }
  }

  /**
   * @desc Serializes request headers object
   * @return {string}
   * @private
   */
  _serializeRequestHeadersObj () {
    this._checkMethod()
    this._ensureProto()
    const purl = this.getParsedURL()
    const headers = this._getReqHeaderObj()
    const path = purl.pathname + purl.searchParams.toString() + purl.hash
    const outString = `${this.method} ${path} ${this.protocol}${CRLF}`
    if (headers != null) {
      if (headers.host == null && headers.Host == null) {
        headers.Host = purl.host
      }
      return outString + stringifyHeaders(headers)
    }
    return outString + `Host: ${purl.host}${CRLF}${CRLF}`
  }

  /**
   * @desc Serialize the request headers for the WARC entry
   * @return {string}
   */
  serializeRequestHeaders () {
    if (this.requestHeadersText != null) {
      return this._serializeRequestHeadersText()
    }
    return this._serializeRequestHeadersObj()
  }

  /**
   * @desc Serialize the response headers for the WARC entry
   * @return {string}
   */
  serializeResponseHeaders () {
    let outString
    if (this.responseHeadersText != null) {
      const protocol = this.responseHeadersText.substring(
        0,
        this.responseHeadersText.indexOf(SPACE)
      )
      outString = canReplayProtocols.has(protocol)
        ? this.responseHeadersText
        : this.responseHeadersText.replace(protocol, HTTP1D1)
      const trailers = outString.substring(outString.length - 4)
      return trailers === HeaderTrailers ? outString : outString + CRLF
    } else if (this.responseHeaders != null) {
      this._ensureProto()
      if (!this.statusText) {
        this.statusText = STATUS_CODES[this.status]
      }
      outString = `${this.protocol} ${this.status} ${
        this.statusText
      }${CRLF}${stringifyHeaders(this.responseHeaders)}`
    }
    return outString
  }

  /**
   * @desc Determine if we have enough information to serialize the response
   * @return {boolean}
   */
  canSerializeResponse () {
    if (this.url.indexOf('data:') === 0) return false
    if (this.responseHeadersText != null) return true
    return (
      this.status != null &&
      this.protocol != null &&
      this.responseHeaders != null
    )
  }

  /**
   * @desc Ensure that the request info object has its method property set
   * @private
   */
  _checkMethod () {
    if (!this.method) {
      let good = false
      if (this.requestHeaders) {
        let maybeMeth = this.requestHeaders[H2Method]
        if (maybeMeth) {
          this.method = maybeMeth
          good = true
        }
      }
      if (this.responseHeaders) {
        let maybeMeth = this.responseHeaders[H2Method]
        if (maybeMeth) {
          this.method = maybeMeth
          good = true
        }
      }
      if (!good && this.requestHeadersText) {
        this._methProtoFromReqHeadText(this.requestHeadersText)
      }
      if (this.method == null) {
        this.method = this.postData != null || this.hasPostData ? 'POST' : 'GET'
      }
    }
  }

  /**
   * @desc Set The Requests Method And Protocol From The Request Headers Text
   * @param {?string} requestHeadersText - The Full HTTP Headers String
   * @private
   */
  _methProtoFromReqHeadText (requestHeadersText) {
    if (requestHeadersText) {
      let httpString = requestHeadersText.substr(
        0,
        requestHeadersText.indexOf(CRLF)
      )
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
   * @param {string} originalProtocol - The ordinal protocol of the request
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

/**
 * @type {CDPRequestInfo}
 */
module.exports = CDPRequestInfo
