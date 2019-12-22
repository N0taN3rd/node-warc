const RequestHandler = require('./requestHandler')
const ElectronWARCGenerator = require('../writers/electron')

/**
 * @extends {RequestHandler}
 * The remote electron request chapturer to use along side {@link ElectronWARCGenerator}
 * See the documentation for {@link attach} and {@link maybeNetworkMessage} for setup information
 * Controlled via {@link startCapturing} and {@link stopCapturing}
 * @see https://electron.atom.io/docs/api/debugger/
 * @see https://chromedevtools.github.io/devtools-protocol/tot/Network
 */
class ElectronRequestCapturer extends RequestHandler {
  /**
   * Create a new ElectronRequestCapturer
   */
  constructor () {
    super()
    /** @ignore */
    this.maybeNetworkMessage = this.maybeNetworkMessage.bind(this)
    /** @ignore */
    this.attach = this.attach.bind(this)
    /** @ignore */
    this.requestWillBeSent = this.requestWillBeSent.bind(this)
    /** @ignore */
    this.responseReceived = this.responseReceived.bind(this)
    /** @ignore */
    this._onMessage = this._onMessage.bind(this)

    /**
     * @type {?ElectronWARCGenerator}
     */
    this.generator = null
  }

  /**
   * Attach to the debugger {@link requestWillBeSent} and {@link responseReceived}
   * @param {Object} wcDebugger - the debugger
   * @see https://electron.atom.io/docs/api/debugger/
   */
  attach (wcDebugger) {
    wcDebugger.on('message', this._onMessage)
  }

  /**
   * Rather than adding an additional listener to the debugger pass the two relevant parameters
   * of the listener to this method. Useful if you are already listening to some other event.
   * {@link attach}, {@link requestWillBeSent} and {@link responseReceived}
   * @param {string} method the event method
   * @param {Object} params the parameters of the event
   * @see https://electron.atom.io/docs/api/debugger/
   */
  maybeNetworkMessage (method, params) {
    if (method === 'Network.requestWillBeSent') {
      this.requestWillBeSent(params)
    } else if (method === 'Network.responseReceived') {
      this.responseReceived(params)
    }
  }

  /**
   * @param {Object} wcDebugger
   * @param {WARCGenOpts} options
   * @returns {Promise<void>}
   */
  generateWARC (wcDebugger, options) {
    this.stopCapturing()
    if (this.generator == null) this.generator = new ElectronWARCGenerator()
    return this.generator.generateWARC(this, wcDebugger, options)
  }

  _onMessage (event, method, params) {
    if (method === 'Network.requestWillBeSent') {
      this.requestWillBeSent(params)
    } else if (method === 'Network.responseReceived') {
      this.responseReceived(params)
    }
  }
}

module.exports = ElectronRequestCapturer
