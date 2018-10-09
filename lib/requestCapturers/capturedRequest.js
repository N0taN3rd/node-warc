/** @ignore */
const uuid = require('uuid/v1')
const RequestInfo = require('./requestInfo')

const isReq = Symbol('is_request')
const isRedir = Symbol('is_redirection')
const isRes = Symbol('is_response')

/**
 * @desc Determine the type of the request
 * @param {Object} info
 * @return {symbol}
 */
function determinRequestType (info) {
  if (info.redirectResponse !== undefined && info.redirectResponse !== null) {
    return isRedir
  } else if (info.request !== undefined && info.request !== null) {
    return isReq
  }
  return isRes
}

/**
 * @desc Represents A Unique Request And Response Chain As Made By A Page
 * Consolidates The Modification Of HTTP/2 Into HTTP/1.1
 * Provides Utility Functionality For Serialization To WARC
 */
class CapturedRequest {
  constructor (info) {
    /**
     * @type {string}
     */
    this.requestId = info.requestId

    /**
     * @type {Map<string,RequestInfo>}
     */
    this._reqs = new Map()
    let rt = determinRequestType(info)
    if (rt === isRedir) {
      // redirection create response RequestInfo for redirect and request
      let redirCR = RequestInfo.fromRedir(info)
      let cr = RequestInfo.fromRequest(info)
      this._reqs.set(redirCR.url, redirCR)
      this._reqs.set(cr.url, cr)
    } else if (rt === isReq) {
      this._reqs.set(info.request.url, RequestInfo.fromRequest(info))
    } else {
      this._reqs.set(info.response.url, RequestInfo.fromResponse(info))
    }
  }

  /**
   * @desc Create a new CapturedRequest
   * @param {Object} info
   * @return {CapturedRequest}
   */
  static newOne (info) {
    return new CapturedRequest(info)
  }

  /**
   * @desc Add request information
   * @param {Object} info
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
        this._reqs.set(info.redirectResponse.url, RequestInfo.fromRedir(info))
      }
      this._reqs.set(info.request.url, RequestInfo.fromRequest(info))
    } else if (rt === isReq) {
      if (this._reqs.has(info.request.url)) {
        this._reqs.set(`${info.request.url}${uuid()}`, RequestInfo.fromRequest(info))
      } else {
        this._reqs.set(info.request.url, RequestInfo.fromRequest(info))
      }
    } else {
      if (!this._reqs.has(info.response.url)) {
        this._reqs.set(info.response.url, RequestInfo.fromResponse(info))
      } else {
        this._reqs.get(info.response.url).addResponse(info.response)
      }
    }
  }

  /**
   * @desc Iterate over the RequestInfo associated with the CapturedRequests#requestId
   * @return {Iterator<RequestInfo>}
   */
  [Symbol.iterator] () {
    return this._reqs.values()
  }

  /**
   *
   * @return {string|Array<String>}
   */
  url () {
    let urls = Array.from(this._reqs.keys())
    if (urls.length === 1) {
      return urls[0]
    }
    return urls
  }

  /**
   * @desc Iterate over the RequestInfo#url associated with the CapturedRequests#requestId
   * @return {Iterator<string>}
   */
  keys () {
    return this._reqs.keys()
  }

  /**
   * @desc Iterate over the RequestInfo associated with the CapturedRequests#requestId
   * @return {Iterator<RequestInfo>}
   */
  values () {
    return this._reqs.values()
  }
}

module.exports = CapturedRequest
