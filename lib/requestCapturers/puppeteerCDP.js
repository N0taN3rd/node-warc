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
    this.requestWillBeSent = this.requestWillBeSent.bind(this)
    this.responseReceived = this.responseReceived.bind(this)
    this.loadingFinished = this.loadingFinished.bind(this)
    this.loadingFailed = this.loadingFailed.bind(this)
    this._navMan = navMan
  }

  /**
   * @param {!CDPSession} client
   * @param {{reqStarted: function(info: Object), reqFinished: function(info: Object)}} [navMan]
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

module.exports = PuppeteerCDPRequestCapturer
