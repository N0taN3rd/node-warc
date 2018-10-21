const RequestHandler = require('./requestHandler')

/**
 * @extends {RequestHandler}
 */
class PuppeteerCDPRequestCapturer extends RequestHandler {
  /**
   * @param {!CDPSession} [client]
   */
  constructor (client) {
    super()
    /** @ignore */
    this.requestWillBeSent = this.requestWillBeSent.bind(this)
    /** @ignore */
    this.responseReceived = this.responseReceived.bind(this)
    this.attach(client)
  }

  /**
   * @param {!CDPSession} client
   */
  attach (client) {
    if (client) {
      client.on('Network.requestWillBeSent', this.requestWillBeSent)
      client.on('Network.responseReceived', this.responseReceived)
    }
  }
}

/**
 * @type {PuppeteerCDPRequestCapturer}
 */
module.exports = PuppeteerCDPRequestCapturer
