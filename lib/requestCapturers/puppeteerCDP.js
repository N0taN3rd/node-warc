const RequestHandler = require('./requestHandler')

/**
 * @extends {RequestHandler}
 */
class PuppeteerCDPRequestCapturer extends RequestHandler {
  /**
   * @param {Object} [navMan]
   */
  constructor (navMan) {
    super()
    /** @ignore */
    this.requestWillBeSent = this.requestWillBeSent.bind(this)
    /** @ignore */
    this.responseReceived = this.responseReceived.bind(this)
    /** @ignore */
    this.loadingFinished = this.loadingFinished.bind(this)
    /** @ignore */
    this.loadingFailed = this.loadingFailed.bind(this)
    /**
     * @type {?Object}
     * @private
     */
    this._navMan = navMan
  }

  /**
   * @param {!CDPSession} client
   * @param {Object} [navMan]
   */
  attach (client, navMan) {
    client.on('Network.requestWillBeSent', this.requestWillBeSent)
    client.on('Network.responseReceived', this.responseReceived)
    this._navMan = this._navMan || navMan
    if (this._navMan) {
      client.on('Network.loadingFinished', this.loadingFinished)
      client.on('Network.loadingFailed', this.loadingFailed)
    }
  }
}

/**
 * @type {PuppeteerCDPRequestCapturer}
 */
module.exports = PuppeteerCDPRequestCapturer
