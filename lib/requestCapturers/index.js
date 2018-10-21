/**
 * @type {ElectronRequestCapturer}
 */
exports.ElectronCapturer = require('./electron')

/**
 * @type {RemoteChromeRequestCapturer}
 */
exports.RemoteChromeCapturer = require('./remoteChrome')

/**
 * @type {PuppeteerCDPRequestCapturer}
 */
exports.PuppeteerCDPCapturer = require('./puppeteerCDP')

/**
 * @type {PuppeteerRequestCapturer}
 */
exports.PuppeteerCapturer = require('./puppeteer')

/**
 * @type {CDPRequestInfo}
 */
exports.CDPRequestInfo = require('./cdpRequestInfo')

/**
 * @type {CapturedRequest}
 */
exports.CapturedRequest = require('./capturedRequest')
