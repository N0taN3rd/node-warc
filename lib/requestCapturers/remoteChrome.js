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
   * @param {Object} network the chrome-remote-interface Network object
   * @param {Object} [navMan]
   */
  constructor (network, navMan) {
    super()
    /** @ignore */
    this.requestWillBeSent = this.requestWillBeSent.bind(this)
    /** @ignore */
    this.responseReceived = this.responseReceived.bind(this)
    /** @ignore */
    this.loadingFinished = this.loadingFinished.bind(this)
    /** @ignore */
    this.loadingFailed = this.loadingFailed.bind(this)

    network.requestWillBeSent(this.requestWillBeSent)
    network.responseReceived(this.responseReceived)
    if (navMan) {
      /**
       * @type {?Object}
       * @private
       */
      this._navMan = navMan
      network.loadingFinished(this.loadingFinished)
      network.loadingFailed(this.loadingFailed)
    }
  }

  /**
   * @param {Object} network the chrome-remote-interface Network object
   * @param {Object} navMan
   */
  withNavigationManager (network, navMan) {
    this._navMan = navMan
    network.loadingFinished(this.loadingFinished)
    network.loadingFailed(this.loadingFailed)
  }
}

/**
 * @type {RemoteChromeRequestCapturer}
 */
module.exports = RemoteChromeRequestCapturer
