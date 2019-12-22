const RequestHandler = require('./requestHandler')
const RemoteChromeWARCGenerator = require('../writers/remoteChrome')

/**
 * @extends {RequestHandler}
 * The remote chrome request chapturer to use along side {@link RemoteChromeWARCGenerator}
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
    /** @ignore */
    this.requestWillBeSent = this.requestWillBeSent.bind(this)
    /** @ignore */
    this.responseReceived = this.responseReceived.bind(this)

    /**
     * @type {?RemoteChromeWARCGenerator}
     */
    this.generator = null
    this.attach(network)
  }

  /**
   * @param {Object} network - The chrome-remote-interface Network object to be attached to
   */
  attach (network) {
    /* istanbul ignore else */
    if (network) {
      network.requestWillBeSent(this.requestWillBeSent)
      network.responseReceived(this.responseReceived)
    }
  }

  /**
   * @param {Object} cdpClient - The chrome-remote-interface client object to detach from
   */
  detach (cdpClient) {
    /* istanbul ignore else */
    if (cdpClient) {
      cdpClient.removeListener(
        'Network.requestWillBeSent',
        this.requestWillBeSent
      )
      cdpClient.removeListener(
        'Network.responseReceived',
        this.responseReceived
      )
    }
  }

  /**
   * @param {Object} network
   * @param {WARCGenOpts} options
   * @returns {Promise<void>}
   */
  generateWARC (network, options) {
    this.stopCapturing()
    if (this.generator == null) this.generator = new RemoteChromeWARCGenerator()
    return this.generator.generateWARC(this, network, options)
  }
}

module.exports = RemoteChromeRequestCapturer
