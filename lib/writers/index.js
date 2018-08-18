module.exports = {
  ElectronWARCWriter: require('./electron'),
  RemoteChromeWARCWriter: require('./remoteChrome'),
  PuppeteerCDPWARCGenerator: require('./puppeteerCDP'),
  PuppeteerWARCGenerator: require('./puppeteer')
}
