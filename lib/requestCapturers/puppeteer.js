/**
 * @desc Puppeteer Request Capturer
 */
class PuppeteerRequestCapturer {
  /**
   * @param {?Page} [page] - The puppeteer page object
   * @param {string} [requestEvent = 'request']
   */
  constructor (page, requestEvent = 'request') {
    /**
     * @desc To Capture Requests Or Not To Capture Requests
     * @type {boolean}
     * @private
     */
    this._capture = true

    /**
     * @desc A list of requests made
     * @type {Map<int,Request>}
     * @private
     */
    this._requests = new Map()
    this._requestC = 0

    /** @ignore */
    this.requestWillBeSent = this.requestWillBeSent.bind(this)
    if (page) {
      this.attach(page, requestEvent)
    }
  }

  /**
   * @desc Attach (start listening for request events) the request capturerer to the page object
   * @param {Page} page - The puppeteer page object
   * @param {string} [requestEvent = 'request']
   */
  attach (page, requestEvent = 'request') {
    page.removeListener(requestEvent, this.requestWillBeSent)
    page.on(requestEvent, this.requestWillBeSent)
  }

  /**
   * @desc Detach (stop listening for request events) the request capturerer from the page object
   * @param {Page} page - The puppeteer page object
   * @param {string} [requestEvent = 'request']
   */
  detach (page, requestEvent = 'request') {
    page.removeListener(requestEvent, this.requestWillBeSent)
  }

  /**
   * @desc Sets an internal flag to begin capturing network requests. Clears Any Previously Captured Request Information
   */
  startCapturing () {
    this._requestC = 0
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
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/@@iterator
   * @desc Get An Iterator Over The Requests Captured
   * @returns {Iterator<Request>}
   */
  [Symbol.iterator]() {
    return this._requests.values()
  }

  /**
   * @desc Remove All Requests
   */
  clear () {
    this._requestC = 0
    this._requests.clear()
  }

  /**
   * @returns {Array<Request>}
   */
  requests () {
    return Array.from(this._requests.values())
  }

  /**
   * @return {Iterator<Request>}
   */
  iterateRequests () {
    return this._requests.values()
  }

  /**
   * @param {Request} r
   */
  requestWillBeSent (r) {
    if (this._capture) {
      this._requests.set(this._requestC++, r)
    }
  }
}

/**
 * @type {PuppeteerRequestCapturer}
 */
module.exports = PuppeteerRequestCapturer
