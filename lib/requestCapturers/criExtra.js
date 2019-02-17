/**
 * @desc chrome-remote-interface-extra request capturer
 * @see https://github.com/N0taN3rd/chrome-remote-interface-extra
 */
class CRIExtraRequestCapturer {
  /**
   * @param {?Page} [page] - The chrome-remote-interface-extra page object
   */
  constructor (page) {
    /**
     * @desc To Capture Requests Or Not To Capture Requests
     * @type {boolean}
     * @private
     */
    this._capture = true

    /**
     * @desc A list of requests made
     * @type {Array<Request>}
     * @private
     */
    this._requests = []
    /** @ignore */
    this.requestWillBeSent = this.requestWillBeSent.bind(this)
    this.attach(page)
  }

  /**
   * @desc Attach (start listening for request events) the request capturerer to the page object
   * @param {?Page} [page] - The puppeteer page object
   */
  attach (page) {
    page.on('request', this.requestWillBeSent)
  }

  /**
   * @desc Detach (stop listening for request events) the request capturerer from the page object
   * @param {?Page} [page] - The puppeteer page object
   */
  detach (page) {
    page.removeListener('request', this.requestWillBeSent)
  }

  /**
   * @desc Sets an internal flag to begin capturing network requests. Clears Any Previously Captured Request Information
   */
  startCapturing () {
    this._requests.length = 0
    this._capture = true
  }

  /**
   * @desc Sets an internal flag to stop the capturing network requests
   */
  stopCapturing () {
    this._capture = false
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/@@iterator
   * @desc Get An Iterator Over The Requests Captured
   * @returns {Iterator<Request>}
   */
  [Symbol.iterator] () {
    return this._requests[Symbol.iterator]()
  }

  /**
   * @desc Remove All Requests
   */
  clear () {
    this._requests.length = 0
  }

  /**
   * @returns {Array<Request>}
   */
  requests () {
    return this._requests
  }

  /**
   * @return {Iterator<Request>}
   */
  * iterateRequests () {
    let i = 0
    let len = this._requests.length
    for (; i < len; i++) {
      yield this._requests[i]
    }
  }

  /**
   * @param {Request} r
   */
  requestWillBeSent (r) {
    if (this._capture) {
      this._requests.push(r)
    }
  }
}

/**
 * @type {CRIExtraRequestCapturer}
 */
module.exports = CRIExtraRequestCapturer
