const CRIExtraWARCGenerator = require('../writers/criExtra')

/**
 * chrome-remote-interface-extra request capturer
 * @see https://github.com/N0taN3rd/chrome-remote-interface-extra
 */
class CRIExtraRequestCapturer {
  /**
   * @param {?Page} [page] - The chrome-remote-interface-extra page object
   * @param {string} [requestEvent = 'request']
   */
  constructor (page, requestEvent = 'request') {
    /**
     * To Capture Requests Or Not To Capture Requests
     * @type {boolean}
     * @private
     */
    this._capture = true

    /**
     * A list of requests made
     * @type {Map<int,Request>}
     * @private
     */
    this._requests = new Map()
    this._requestC = 0
    /**
     * @type {?CRIExtraWARCGenerator}
     */
    this.generator = null
    /** @ignore */
    this.requestWillBeSent = this.requestWillBeSent.bind(this)
    if (page) {
      this.attach(page, requestEvent)
    }
  }

  /**
   * Attach (start listening for request events) the request capturerer to the page object
   * @param {Page} page - The chrome-remote-interface-extra page object
   * @param {string} [requestEvent = 'request']
   */
  attach (page, requestEvent = 'request') {
    this.detach(page)
    page.removeListener(requestEvent, this.requestWillBeSent)
    page.on(requestEvent, this.requestWillBeSent)
  }

  /**
   * Detach (stop listening for request events) the request capturerer from the page object
   * @param {Page} page - The puppeteer page object
   * @param {string} [requestEvent = 'request']
   */
  detach (page, requestEvent = 'request') {
    page.removeListener(requestEvent, this.requestWillBeSent)
  }

  /**
   * Sets an internal flag to begin capturing network requests. Clears Any Previously Captured Request Information
   */
  startCapturing () {
    this._requestC = 0
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
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/@@iterator
   * Get An Iterator Over The Requests Captured
   * @returns {Iterator<Request>}
   */
  [Symbol.iterator] () {
    return this._requests.values()
  }

  /**
   * Remove All Requests
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

  /**
   *
   * @param {WARCGenOpts} options
   * @returns {Promise<void>}
   */
  generateWARC (options) {
    this.stopCapturing()
    if (this.generator == null) this.generator = new CRIExtraWARCGenerator()
    return this.generator.generateWARC(this, options)
  }
}

module.exports = CRIExtraRequestCapturer
