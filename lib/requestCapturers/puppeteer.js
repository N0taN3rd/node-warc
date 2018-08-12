class PuppeteerRequestCapturer {
  /**
   * @param {Page} page
   * @param {Object} [navMan]
   */
  constructor (page, navMan) {
    /**
     * @desc To Capture Requests Or Not To Capture Requests
     * @type {boolean}
     * @private
     */
    this._capture = true

    /**
     * @desc Association Of RequestIds To CapturedRequests
     * @type {Map<string,Set<Request>>}
     * @private
     */
    this._requests = new Map()

    this.page = page
    this.requestWillBeSent = this.requestWillBeSent.bind(this)
    this.loadingFinished = this.loadingFinished.bind(this)
    this.loadingFailed = this.loadingFailed.bind(this)
    this.page.on('request', this.requestWillBeSent)
    this.page.on('requestfinished', this.loadingFailed)
    this.page.on('requestfailed', this.loadingFinished)
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
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/@@iterator
   * @desc Get An Iterator Over The Request Id, Request Object Pairs
   * @returns {Iterator<[string,Request]>}
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
   * @return {Iterator<Request>}
   */
  * iterateRequests () {
    for (let cr of this._requests.values()) {
      for (let ri of cr.values()) {
        yield ri
      }
    }
  }

  requestWillBeSent (r) {
    if (this._capture) {
      if (!this._requests.has(r._requestId)) {
        this._requests.set(r._requestId, new Set([r]))
      } else {
        this._requests.get(r._requestId).add(r)
      }
    }
  }

  loadingFinished (r) {
    if (this._capture && this._navMan) {
      this._navMan.reqFinished({ requestId: r._requestId })
    }
  }

  loadingFailed (r) {
    if (this._capture && this._navMan) {
      this._navMan.reqFinished({ requestId: r._requestId })
    }
  }
}

module.exports = PuppeteerRequestCapturer
