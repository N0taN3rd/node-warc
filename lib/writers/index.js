/**
 * @type {{ElectronWARCWriter: ElectronWARCGenerator, RemoteChromeWARCWriter: RemoteChromeWARCGenerator, PuppeteerCDPWARCGenerator: PuppeteerCDPWARCGenerator, PuppeteerWARCGenerator: PuppeteerWARCGenerator, WARCWriterBase: WARCWriterBase, CRIExtraWARCGenerator: CRIExtraWARCGenerator}}
 */
module.exports = {
  /**
   * @type {ElectronWARCGenerator}
   */
  ElectronWARCWriter: require('./electron'),

  /**
   * @type {RemoteChromeWARCGenerator}
   */
  RemoteChromeWARCWriter: require('./remoteChrome'),

  /**
   * @type {PuppeteerCDPWARCGenerator}
   */
  PuppeteerCDPWARCGenerator: require('./puppeteerCDP'),

  /**
   * @type {PuppeteerWARCGenerator}
   */
  PuppeteerWARCGenerator: require('./puppeteer'),

  /**
   * @type {WARCWriterBase}
   */
  WARCWriterBase: require('./warcWriterBase'),

  /**
   * @type {CRIExtraWARCGenerator}
   */
  CRIExtraWARCGenerator: require('./criExtra')
}
