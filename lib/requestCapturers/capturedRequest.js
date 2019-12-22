const uuid = require('uuid/v1')
const CDPRequestInfo = require('./cdpRequestInfo')

/**
 * @type {symbol}
 */
const isReq = Symbol('is_request')
/**
 * @type {symbol}
 */
const isRedir = Symbol('is_redirection')
/**
 * @type {symbol}
 */
const isRes = Symbol('is_response')

/**
 * Determine the type of the request
 * @param {Object} info
 * @return {symbol}
 */
function determinRequestType (info) {
  if (info.redirectResponse != null) {
    return isRedir
  } else if (info.request != null) {
    return isReq
  }
  return isRes
}

/**
 * Represents A Unique Request And Response Chain As Made By A Page
 * Consolidates The Modification Of HTTP/2 Into HTTP/1.1
 * Provides Utility Functionality For Serialization To WARC
 */
class CapturedRequest {
  /**
   * @param {Object} info - The object received from Network.requestWillBeSent or Network.responseReceived
   */
  constructor (info) {
    /**
     * @type {string}
     */
    this.requestId = info.requestId

    /**
     * @type {Map<string, CDPRequestInfo>}
     */
    this._reqs = new Map()
    const rt = determinRequestType(info)
    if (rt === isRedir) {
      // redirection create response RequestInfo for redirect and request
      const redirCR = CDPRequestInfo.fromRedir(info)
      const cr = CDPRequestInfo.fromRequest(info)
      this._reqs.set(redirCR.url, redirCR)
      this._reqs.set(cr.url, cr)
    } else if (rt === isReq) {
      this._reqs.set(info.request.url, CDPRequestInfo.fromRequest(info))
    } else {
      this._reqs.set(info.response.url, CDPRequestInfo.fromResponse(info))
    }
  }

  /**
   * Create a new CapturedRequest
   * @param {Object} info - The object received from Network.requestWillBeSent or Network.responseReceived
   * @return {CapturedRequest}
   */
  static newOne (info) {
    return new CapturedRequest(info)
  }

  /**
   * Add request information
   * @param {Object} info - The object received from Network.requestWillBeSent or Network.responseReceived
   */
  addRequestInfo (info) {
    let rt = determinRequestType(info)
    if (rt === isRedir) {
      let haveRedir = this._reqs.has(info.redirectResponse.url)
      if (haveRedir) {
        this._reqs
          .get(info.redirectResponse.url)
          .addResponse(info.redirectResponse, false)
      } else {
        this._reqs.set(
          info.redirectResponse.url,
          CDPRequestInfo.fromRedir(info)
        )
      }
      this._reqs.set(info.request.url, CDPRequestInfo.fromRequest(info))
    } else if (rt === isReq) {
      if (this._reqs.has(info.request.url)) {
        this._reqs.set(
          `${info.request.url}${uuid()}`,
          CDPRequestInfo.fromRequest(info)
        )
      } else {
        this._reqs.set(info.request.url, CDPRequestInfo.fromRequest(info))
      }
    } else {
      if (!this._reqs.has(info.response.url)) {
        this._reqs.set(info.response.url, CDPRequestInfo.fromResponse(info))
      } else {
        this._reqs.get(info.response.url).addResponse(info.response)
      }
    }
  }

  /**
   * Iterate over the RequestInfo associated with the CapturedRequests#requestId
   * @return {Iterator<CDPRequestInfo>}
   */
  [Symbol.iterator] () {
    return this._reqs.values()
  }

  /**
   *
   * @return {string|Array<string>}
   */
  url () {
    const urls = Array.from(this._reqs.keys())
    if (urls.length === 1) {
      return urls[0]
    }
    return urls
  }

  /**
   * Iterate over the RequestInfo#url associated with the CapturedRequests#requestId
   * @return {Iterator<string>}
   */
  keys () {
    return this._reqs.keys()
  }

  /**
   * Iterate over the CDPRequestInfo associated with the CapturedRequests#requestId
   * @return {Iterator<CDPRequestInfo>}
   */
  values () {
    return this._reqs.values()
  }
}

module.exports = CapturedRequest
