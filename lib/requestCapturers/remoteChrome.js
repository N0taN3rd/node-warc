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
   * @param {{reqStarted: function(info: Object), reqFinished: function(info: Object)}} [navMan]
   */
  constructor (network, navMan) {
    super()
    this.requestWillBeSent = this.requestWillBeSent.bind(this)
    this.responseReceived = this.responseReceived.bind(this)
    this.loadingFinished = this.loadingFinished.bind(this)
    this.loadingFailed = this.loadingFailed.bind(this)

    network.requestWillBeSent(this.requestWillBeSent)
    network.responseReceived(this.responseReceived)
    if (navMan) {
      this._navMan = navMan
      network.loadingFinished(this.loadingFinished)
      network.loadingFailed(this.loadingFailed)
    }
  }

  /**
   * @param {Object} network the chrome-remote-interface Network object
   * @param {{reqStarted: function(info: Object), reqFinished: function(info: Object)}} navMan
   */
  withNavigationManager (network, navMan) {
    this._navMan = navMan
    network.loadingFinished(this.loadingFinished)
    network.loadingFailed(this.loadingFailed)
  }
}

module.exports = RemoteChromeRequestCapturer
