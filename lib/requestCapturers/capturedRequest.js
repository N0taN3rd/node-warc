const uuid = require('uuid/v1')
const {CRLF} = require('../writers/warcFields')
const {canReplayProtocols, SPACE, H2Method} = require('../utils/constants')

/**
 * Represents A Unique Request And Response Chain As Made By A Page
 *
 * Consolidates The Modification Of HTTP/2 Into HTTP/1.1
 *
 * Provides Utility Functionality For Serialization To WARC
 */
class CapturedRequest {
  /**
   * @desc Create A New Captured Request
   * @param {Object} info The Object Returned By ``requestWillBeSent`` Or ``responseReceived`` Event Handlers
   * @param {boolean} [noHttp2 = false] Convert Non HTTP/1.0 Or HTTP/1.1 Protocols Into HTTP/1.1
   */
  constructor (info) {
    /**
     * @desc The Unique Request Identifier
     * @type {string}
     */
    this.requestId = info.requestId

    if (info.redirectResponse !== undefined && info.redirectResponse !== null) {
      /**
       * @desc HTTP 3xx Response Information
       * @type {{url: string, status: string, statusText: string, headers: Object, headersText: string, requestHeaders: Object, requestHeadersText: string, method: string, protocol: string}}
       */
      this.redirectResponse = {
        url: info.redirectResponse.url,
        status: info.redirectResponse.status,
        statusText: info.redirectResponse.statusText,
        headers: info.redirectResponse.headersText,
        headersText: info.redirectResponse.headersText,
        requestHeaders: info.redirectResponse.requestHeaders || info.request.headers,
        requestHeadersText: info.redirectResponse.requestHeadersText,
        method: info.redirectResponse.method || info.request.method,
        protocol: this._correctProtocol(info.redirectResponse.protocol)
      }
    }

    if (info.request) {
      /**
       * @desc The Requests URL
       * @type {?string}
       */
      this.url = info.request.url

      /**
       * @desc The Request HTTP Headers
       * @type {?Object}
       */
      this.headers = info.request.headers

      /**
       * @desc The HTTP Method For This Request
       * @type {?string}
       */
      this.method = info.request.method

      if (info.request.postData !== undefined && info.request.postData !== null) {
        /**
         * @desc The Data Of A Post Request
         * @type {?Object[]}
         */
        this.postData = info.request.postData
      }
    }

    if (info.response) {
      if (!this.url) {
        this.url = info.response.url
      }

      /**
       * @desc The Response Information
       * @type {?{url: string, status: string, statusText: string, headers: Object, headersText: Object, requestHeaders: Object, requestHeadersText: Object, protocol: string, encoding: string}}
       */
      this.res = {
        url: info.response.url,
        status: info.response.status,
        statusText: info.response.statusText,
        headers: info.response.headers,
        headersText: info.response.headersText,
        requestHeaders: info.response.requestHeaders,
        requestHeadersText: info.response.requestHeadersText,
        protocol: this._correctProtocol(info.redirectResponse.protocol)
      }

      if (!this.headers) {
        if (info.response.requestHeaders) {
          this.headers = info.response.requestHeaders
        } else if (info.response.requestHeadersText) {
          let head = {}
          let headArray = info.response.requestHeadersText.split(CRLF)
          let len = headArray.length - 2 // contains two trailing CRLF
          let i = 1
          let headSplit
          while (i < len) {
            headSplit = headArray[i].split(': ')
            head[headSplit[0]] = headSplit[1]
            i++
          }
          this.headers = head
          let httpStringParts = headArray[0].split(SPACE)
          this.method = this.method || httpStringParts[0]
          this.protocol = this.protocol || this._correctProtocol(httpStringParts[2])
        }
      }

      if (!this.method) {
        if (info.response.requestHeaders) {
          let method = info.response.requestHeaders[H2Method]
          if (method && method !== '') {
            this.method = method
          } else if (info.response.requestHeadersText) {
            this._methProtoFromReqHeadText(info.response.requestHeadersText)
          }
        } else if (info.response.requestHeadersText) {
          this._methProtoFromReqHeadText(info.response.requestHeadersText)
        }
      }
    }
  }

  /**
   * @desc Add Redirection Information If The Request For The Same ID Is 3xx Otherwise We Only Saw A Response For It Or Double Request For Same ID
   * @param {Object} info The Object Returned By ``requestWillBeSent`` Event Handler
   * @param {Map<String,CapturedRequest>} reqMap The Map Containing This Captured Request
   */
  addRedirect (info, reqMap) {
    if (info.redirectResponse) {
      if (this.redirectResponse) {
        if (Array.isArray(this.redirectResponse)) {
          this.redirectResponse.push({
            url: info.redirectResponse.url,
            status: info.redirectResponse.status,
            statusText: info.redirectResponse.statusText,
            headers: info.redirectResponse.headers,
            headersText: info.redirectResponse.headersText,
            requestHeaders: info.redirectResponse.requestHeaders || info.request.headers,
            requestHeadersText: info.redirectResponse.requestHeadersText,
            method: info.redirectResponse.method || info.request.method,
            protocol: this._correctProtocol(info.redirectResponse.protocol)
          })
        } else {
          let oldRR = this.redirectResponse
          this.redirectResponse = [oldRR, {
            url: info.redirectResponse.url,
            status: info.redirectResponse.status,
            statusText: info.redirectResponse.statusText,
            headers: info.redirectResponse.headers,
            headersText: info.redirectResponse.headersText,
            requestHeaders: info.redirectResponse.requestHeaders || info.request.headers,
            requestHeadersText: info.redirectResponse.requestHeadersText,
            method: info.redirectResponse.method || info.request.method,
            protocol: this._correctProtocol(info.redirectResponse.protocol)
          }]
        }
      } else {
        this.redirectResponse = {
          url: info.redirectResponse.url,
          status: info.redirectResponse.status,
          statusText: info.redirectResponse.statusText,
          headers: info.redirectResponse.headers,
          headersText: info.redirectResponse.headersText,
          requestHeaders: info.redirectResponse.requestHeaders || info.request.headers,
          requestHeadersText: info.redirectResponse.requestHeadersText,
          method: info.redirectResponse.method || info.request.method,
          protocol: this._correctProtocol(info.redirectResponse.protocol)
        }
      }
    } else if (
      (this.headers === null || this.headers === undefined) &&
      (this.method === null || this.method === undefined) &&
      (this.url === null || this.url === undefined) &&
      (this.res !== null && this.res !== undefined)
    ) {
      // we had a random response from nowhere but we found a request that matches the ID!
      this.url = info.request.url
      this.headers = info.request.headers
      this.method = info.request.method
      if (info.request.postData !== undefined && info.request.postData !== null) {
        this.postData = info.request.postData
      }
      if (info.response) {
        this.addResponse(info)
      }
    } else {
      // for whatever reason non of the conditions we are looking for met so just note it for WARC serialization
      reqMap.set(`${info.requestId}${uuid()}`, new CapturedRequest(info))
    }
  }

  /**
   * @desc Add The Response Information
   * @param {Object} info The Object Returned By ``responseReceived`` Event Handler
   */
  addResponse (info) {
    if (this.res) {
      if (Array.isArray(this.res)) {
        this.res.push({
          url: info.response.url,
          status: info.response.status,
          statusText: info.response.statusText,
          headers: info.response.headers,
          headersText: info.response.headersText,
          requestHeaders: info.response.requestHeaders,
          requestHeadersText: info.response.requestHeadersText,
          protocol: this._correctProtocol(info.response.protocol)
        })
      } else {
        let oldRes = this.res
        this.res = [oldRes, {
          url: info.response.url,
          status: info.response.status,
          statusText: info.response.statusText,
          headers: info.response.headers,
          headersText: info.response.headersText,
          requestHeaders: info.response.requestHeaders,
          requestHeadersText: info.response.requestHeadersText,
          protocol: this._correctProtocol(info.response.protocol)
        }]
      }
    } else {
      this.res = {
        url: info.response.url,
        status: info.response.status,
        statusText: info.response.statusText,
        headers: info.response.headers,
        headersText: info.response.headersText,
        requestHeaders: info.response.requestHeaders,
        requestHeadersText: info.response.requestHeadersText,
        protocol: this._correctProtocol(info.response.protocol)
      }
    }
  }

  serializeRequest (aReq) {

  }

  toJSON () {
    return {
      requestId: this.requestId,
      url: this.url,
      method: this.method,
      protocol: this.protocol,
      postData: this.postData,
      headers: this.headers,
      redirectResponse: this.redirectResponse,
      res: this.res
    }
  }

  /**
   * @desc Get The Correct Protocol. Handles Lower Case Or Upper Case And {@link noHttp2}. If The Supplied Protocol Is Null Or Undefined Defaults To HTTP/1.1
   * @param {string} originalProtocol The Possibly HTTP2 Protocol
   * @returns {string} The Correct Protocol Dependant On {@link noHttp2}
   * @private
   */
  _correctProtocol (originalProtocol) {
    let newProtocol
    if (originalProtocol) {
      newProtocol = originalProtocol.toUpperCase()
      newProtocol = canReplayProtocols.has(newProtocol) ? newProtocol : 'HTTP/1.1'
    } else {
      newProtocol = 'HTTP/1.1'
    }
    if (!this.protocol) {
      this.protocol = newProtocol
    }
    return newProtocol
  }

  /**
   * @desc Set The Requests Method And Protocol From The Request Headers Text
   * @param {?string} requestHeadersText The Full HTTP Headers String
   * @private
   */
  _methProtoFromReqHeadText (requestHeadersText) {
    if (requestHeadersText) {
      let httpString = requestHeadersText.substr(0, requestHeadersText.indexOf(CRLF))
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
}

module.exports = CapturedRequest
