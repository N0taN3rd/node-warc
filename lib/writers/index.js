/**
 * @type {ElectronWARCGenerator}
 */
exports.ElectronWARCWriter = require('./electron')

/**
 * @type {RemoteChromeWARCGenerator}
 */
exports.RemoteChromeWARCWriter = require('./remoteChrome')

/**
 * @type {PuppeteerCDPWARCGenerator}
 */
exports.PuppeteerCDPWARCGenerator = require('./puppeteerCDP')

/**
 * @type {PuppeteerWARCGenerator}
 */
exports.PuppeteerWARCGenerator = require('./puppeteer')

/**
 * @type {WARCWriterBase}
 */
exports.WARCWriterBase = require('./warcWriterBase')

/**
 * @type {CRIExtraWARCGenerator}
 */
exports.CRIExtraWARCGenerator = require('./criExtra')
