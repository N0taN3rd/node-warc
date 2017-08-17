const RequestHandler = require('./requestHandler')

/**
 * @extends RequestHandler
 * @desc The remote chrome request chapturer to use along side {@link RemoteChromeWARCGenerator}
 * The only setup required is to pass the chrome-remote-interface Network object
 * Controlled via {@link startCapturing} and {@link stopCapturing}
 * @see https://github.com/cyrus-and/chrome-remote-interface
 * @see https://chromedevtools.github.io/devtools-protocol/tot/Network
 */
class RemoteChromeRequestCapturer extends RequestHandler {
  /**
   * @param {Object} network the chrome-remote-interface Network object
   * @param {boolean} [noHTTP2 = false] Keep HTTP/2 Protocol Or Turn It Into HTTP/1.1
   */
  constructor (network, noHTTP2 = false) {
    super(noHTTP2)
    this.requestWillBeSent = this.requestWillBeSent.bind(this)
    this.responseReceived = this.responseReceived.bind(this)

    network.requestWillBeSent(this.requestWillBeSent)
    network.responseReceived(this.responseReceived)
  }
}

module.exports = RemoteChromeRequestCapturer
