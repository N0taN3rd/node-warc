const CapturedRequest = require('./capturedRequest')

/**
 * Class Responsible For Managing The Captured Request / Responses For A Page
 */
class RequestHandler {
  /**
   * Create A New RequestHandler
   */
  constructor () {
    /**
     * To Capture Requests Or Not To Capture Requests
     * @type {boolean}
     * @private
     */
    this._capture = true

    /**
     * Association Of RequestIds To CapturedRequests
     * @type {Map<string,CapturedRequest>}
     * @private
     */
    this._requests = new Map()
  }

  /**
   * Sets an internal flag to begin capturing network requests.
   * Clears Any Previously Captured Request Information
   */
  startCapturing () {
    this._requests.clear()
    this._capture = true
  }

  /**
   * Sets an internal flag to stop the capturing network requests
   */
  stopCapturing () {
    this._capture = false
  }

  /**
   * Handles either the Network.requestWillBeSent or the Network.responseReceived events
   * @see https://chromedevtools.github.io/devtools-protocol/tot/Network/#event-requestWillBeSent
   * @see https://chromedevtools.github.io/devtools-protocol/tot/Network/#event-responseReceived
   * @param {Object} info
   */
  addRequestInfo (info) {
    if (this._capture) {
      if (this._requests.has(info.requestId)) {
        this._requests.get(info.requestId).addRequestInfo(info)
      } else {
        this._requests.set(info.requestId, new CapturedRequest(info))
      }
    }
  }

  /**
   * Handles the Network.requestWillBeSent event
   * @see https://chromedevtools.github.io/devtools-protocol/tot/Network/#event-requestWillBeSent
   * @param {Object} info
   */
  requestWillBeSent (info) {
    if (this._capture) {
      if (this._requests.has(info.requestId)) {
        this._requests.get(info.requestId).addRequestInfo(info)
      } else {
        this._requests.set(info.requestId, new CapturedRequest(info))
      }
    }
  }

  /**
   * Handles the Network.responseReceived event
   * @see https://chromedevtools.github.io/devtools-protocol/tot/Network/#event-responseReceived
   * @param {Object} info
   */
  responseReceived (info) {
    if (this._capture) {
      if (!this._requests.has(info.requestId)) {
        this._requests.set(info.requestId, new CapturedRequest(info))
      } else {
        this._requests.get(info.requestId).addRequestInfo(info)
      }
    }
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/@@iterator
   * Get An Iterator Over The Request Id, Request Object Pairs
   * @returns {Iterator}
   */
  [Symbol.iterator] () {
    return this._requests[Symbol.iterator]()
  }

  /**
   * Remove All Requests
   */
  clear () {
    this._requests.clear()
  }

  /**
   * Does The Interceptor Have The Request Object Associated With A Request Id
   * @param {!string} requestId
   * @returns {boolean}
   */
  has (requestId) {
    return this._requests.has(requestId)
  }

  /**
   * Retrieve The Corresponding Request Object For A Request Id
   * @param {!string} requestId
   * @returns {CapturedRequest}
   */
  get (requestId) {
    return this._requests.get(requestId)
  }

  /**
   * @returns {number}
   */
  size () {
    return this._requests.size
  }

  /**
   * Get An Iterator Over The Request Id, Request Object Pairs
   * @returns {Iterator}
   */
  entries () {
    return this._requests.entries()
  }

  /**
   * Get An Iterator Over The Request Ids
   * @returns {Iterator<string>}
   */
  keys () {
    return this._requests.keys()
  }

  /**
   * Get An Iterator Over The Request Objects
   * @returns {Iterator<CapturedRequest>}
   */
  values () {
    return this._requests.values()
  }

  /**
   * Apply An Iteratee Once For Each Mapped Request Id, Request Object Pair
   * @param {!function} iteratee the function to be applied
   * @param {*} [thisArg] optional this argument
   */
  forEach (iteratee, thisArg) {
    this._requests.forEach(iteratee, thisArg)
  }

  /**
   * @return {Iterator<CDPRequestInfo>}
   */
  * iterateRequests () {
    for (const cr of this._requests.values()) {
      for (const ri of cr.values()) {
        yield ri
      }
    }
  }

  /**
   * @return {Iterator<CDPRequestInfo>}
   */
  [Symbol.iterator] () {
    return this.iterateRequests()
  }
}

module.exports = RequestHandler
