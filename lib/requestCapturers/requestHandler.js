const CapturedRequest = require('./capturedRequest')

/**
 * Class Responsible For Managing The Captured Request / Responses For A Page
 */
class RequestHandler {
  /**
   * @desc Create A New RequestInterceptor
   * @param {boolean} [noHttp2 = false] Keep HTTP/2 Protocol Or Turn It Into HTTP/1.1
   */
  constructor (noHttp2 = false) {
    /**
     * @desc To Capture Requests Or Not To Capture Requests
     * @type {boolean}
     * @private
     */
    this._capture = true

    /**
     * @desc Association Of RequestIds To CapturedRequests
     * @type {Map<string,CapturedRequest>}
     * @private
     */
    this._requests = new Map()

    /**
     * @desc Keep HTTP/2 Protocol Or Turn It Into HTTP/1.1
     * @type {boolean}
     * @private
     */
    this._noHTTP2 = noHttp2

    this._navMan = null
  }

  withRequestMonitoring (navMan) {
    this._navMan = navMan
  }

  /**
   * @desc Sets an internal flag to begin capturing network requests. Clears Any Previously Captured Request Information
   */
  startCapturing () {
    this._requests.clear()
    this._capture = true
  }

  /**
   * @desc Sets an internal flag to stop the capturing network requests
   */
  stopCapturing () {
    this._capture = false
  }

  /**
   * @desc Is The Request Handler Keeping HTTP2 Protocol Or Transforming It To HTTP/1.1
   * @returns {boolean}
   */
  get noHTTP2 () {
    return this._noHTTP2
  }

  /**
   * @desc Set The Flag To Keep HTTP2 Protocol
   */
  keepHTTP2 () {
    this._noHTTP2 = false
  }

  /**
   * @desc Set The Flag To Transform HTTP2 Protocol Into HTTP/1.1
   */
  transformHTTP2 () {
    this._noHTTP2 = true
  }

  /**
   * @desc Handles the Network.requestWillBeSent event
   * @see https://chromedevtools.github.io/devtools-protocol/tot/Network/#event-requestWillBeSent
   * @param {Object} info
   */
  requestWillBeSent (info) {
    if (this._capture) {
      if (this._requests.has(info.requestId)) {
        this._requests.get(info.requestId).addRedirect(info, this._requests)
      } else {
        this._requests.set(info.requestId, new CapturedRequest(info, this._noHTTP2))
      }
      if (this._navMan) {
        this._navMan.reqStarted(info)
      }
    }
  }

  /**
   * @desc Handles the Network.responseReceived event
   * @see https://chromedevtools.github.io/devtools-protocol/tot/Network/#event-responseReceived
   * @param {Object} info
   */
  responseReceived (info) {
    if (this._capture) {
      if (!this._requests.has(info.requestId)) {
        this._requests.set(info.requestId, new CapturedRequest(info, this._noHTTP2))
      } else {
        this._requests.get(info.requestId).addResponse(info)
      }
    }
  }

  loadingFinished (info) {
    if (this._capture) {
      this._navMan.reqFinished(info)
    }
  }

  loadingFailed (info) {
    if (this._capture) {
      this._navMan.reqFinished(info)
    }
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/@@iterator
   * @desc Get An Iterator Over The Request Id, Request Object Pairs
   * @returns {Iterator<[string,CapturedRequest]>}
   */
  [Symbol.iterator] () {
    return this._requests[Symbol.iterator]()
  }

  /**
   * @desc Remove All Requests
   */
  clear () {
    this._requests.clear()
  }

  /**
   * @desc Does The Interceptor Have The Request Object Associated With A Request Id
   * @param {!string} requestId
   * @returns {boolean}
   */
  has (requestId) {
    return this._requests.has(requestId)
  }

  /**
   * @desc Map A Request Id To Its Request Object
   * @param {!string} requestId
   * @param {!CapturedRequest} request
   */
  set (requestId, request) {
    this._requests.set(requestId, request)
  }

  /**
   * @desc Retrieve The Corresponding Request Object For A Request Id
   * @param {!string} requestId
   * @returns {CapturedRequest}
   */
  get (requestId) {
    return this._requests.get(requestId)
  }

  /**
   * @desc Get An Iterator Over The Request Id, Request Object Pairs
   * @returns {Iterator<[string,CapturedRequest]>}
   */
  entries () {
    return this._requests.entries()
  }

  /**
   * @desc Get An Iterator Over The Request Ids
   * @returns {Iterator<string>}
   */
  keys () {
    return this._requests.keys()
  }

  /**
   * @desc Get An Iterator Over The Request Objects
   * @returns {Iterator<CapturedRequest>}
   */
  values () {
    return this._requests.values()
  }

  /**
   * @desc Apply An Iteratee Once For Each Mapped Request Id, Request Object Pair
   * @param {!function} iteratee the function to be applied
   * @param {*} [thisArg] optional this argument
   */
  forEach (iteratee, thisArg) {
    this._requests.forEach(iteratee, thisArg)
  }
}

module.exports = RequestHandler
