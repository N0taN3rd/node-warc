/**
 * @type {CDPRequestInfo}
 */
exports.CDPRequestInfo = require('./cdpRequestInfo')

/**
 * @type {CRIExtraRequestCapturer}
 */
exports.CRIExtraCapturer = require('./criExtra')

/**
 * @type {CapturedRequest}
 */
exports.CapturedRequest = require('./capturedRequest')

/**
 * @type {ElectronRequestCapturer}
 */
exports.ElectronCapturer = require('./electron')

/**
 * @type {PuppeteerCDPRequestCapturer}
 */
exports.PuppeteerCDPCapturer = require('./puppeteerCDP')

/**
 * @type {PuppeteerRequestCapturer}
 */
exports.PuppeteerCapturer = require('./puppeteer')

/**
 * @type {RemoteChromeRequestCapturer}
 */
exports.RemoteChromeCapturer = require('./remoteChrome')

/**
 * @type {RequestHandler}
 */
exports.RequestHandler = require('./requestHandler')
