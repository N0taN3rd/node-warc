const RequestHandler = require('./requestHandler')

/**
 * @extends {RequestHandler}
 * @desc The remote chrome request chapturer to use along side {@link RemoteChromeWARCGenerator}
 * The only setup required is to pass the chrome-remote-interface Network object
 * Controlled via {@link startCapturing} and {@link stopCapturing}
 * @see https://github.com/cyrus-and/chrome-remote-interface
 * @see https://chromedevtools.github.io/devtools-protocol/tot/Network
 */
class RemoteChromeRequestCapturer extends RequestHandler {
  /**
   * @param {?Object} [network] - The chrome-remote-interface Network object
   */
  constructor (network) {
    super()
    this.requestWillBeSent = this.requestWillBeSent.bind(this)
    this.responseReceived = this.responseReceived.bind(this)
    this.attach(network)
  }

  /**
   * @param {Object} network - The chrome-remote-interface Network object to be attached to
   */
  attach (network) {
    if (network) {
      network.requestWillBeSent(this.requestWillBeSent)
      network.responseReceived(this.responseReceived)
    }
  }

  /**
   * @param {Object} cdpClient - The chrome-remote-interface client object to detach from
   */
  detach (cdpClient) {
    if (cdpClient) {
      cdpClient.removeListener('Network.requestWillBeSent', this.requestWillBeSent)
      cdpClient.removeListener('Network.responseReceived', this.responseReceived)
    }
  }
}

/**
 * @type {RemoteChromeRequestCapturer}
 */
module.exports = RemoteChromeRequestCapturer
