/**
 * @type {{ElectronCapturer: ElectronRequestCapturer, RemoteChromeCapturer: RemoteChromeRequestCapturer, PuppeteerCDPCapturer: PuppeteerCDPRequestCapturer, PuppeteerCapturer: PuppeteerRequestCapturer, CDPRequestInfo: CDPRequestInfo, CapturedRequest: CapturedRequest, RequestHandler: RequestHandler}}
 */
module.exports = {
  ElectronCapturer: require('./electron'),
  RemoteChromeCapturer: require('./remoteChrome'),
  PuppeteerCDPCapturer: require('./puppeteerCDP'),
  PuppeteerCapturer: require('./puppeteer'),
  CDPRequestInfo: require('./cdpRequestInfo'),
  CapturedRequest: require('./capturedRequest'),
  RequestHandler: require('./requestHandler'),
  CRIExtraCapturer: require('./criExtra')
}
