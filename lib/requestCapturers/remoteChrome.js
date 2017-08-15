const RequestInterceptor = require('./requestInterceptor')

/**
 * @extends RequestInterceptor
 * @desc The remote chrome request chapturer to use along side {@link RemoteChromeWARCGenerator}
 * The only setup required is to pass the chrome-remote-interface Network object
 * Controlled via {@link startCapturing} and {@link stopCapturing}
 * @see https://github.com/cyrus-and/chrome-remote-interface
 * @see https://chromedevtools.github.io/devtools-protocol/tot/Network
 */
class RemoteChromeRequestCapturer extends RequestInterceptor {
  /**
   * @param {Object} network the chrome-remote-interface Network object
   */
  constructor (network) {
    super()
    this.requestWillBeSent = this.requestWillBeSent.bind(this)
    this.responseReceived = this.responseReceived.bind(this)

    network.requestWillBeSent(this.requestWillBeSent)
    network.responseReceived(this.responseReceived)
  }
}

module.exports = RemoteChromeRequestCapturer
