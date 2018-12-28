const RequestHandler = require('./requestHandler')

/**
 * @extends {RequestHandler}
 */
class PuppeteerCDPRequestCapturer extends RequestHandler {
  /**
   * @param {?CDPSession} [client] - The CDPSession client to be attached to
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
   * @param {CDPSession} client - The CDPSession client to be attached to
   */
  attach (client) {
    /* istanbul ignore else */
    if (client) {
      client.on('Network.requestWillBeSent', this.requestWillBeSent)
      client.on('Network.responseReceived', this.responseReceived)
    }
  }

  /**
   * @param {CDPSession} client - The CDPSession client to detach from
   */
  detach (client) {
    /* istanbul ignore else */
    if (client) {
      client.removeListener('Network.requestWillBeSent', this.requestWillBeSent)
      client.removeListener('Network.responseReceived', this.responseReceived)
    }
  }
}

/**
 * @type {PuppeteerCDPRequestCapturer}
 */
module.exports = PuppeteerCDPRequestCapturer
