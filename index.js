'use strict'
const {
  WARCStreamTransform,
  AutoWARCParser,
  WARCGzParser,
  WARCParser
} = require('./lib/parsers')

const {
  ElectronWARCWriter,
  PuppeteerCDPWARCGenerator,
  PuppeteerWARCGenerator,
  RemoteChromeWARCWriter,
  WARCWriterBase
} = require('./lib/writers')

const {
  ElectronCapturer,
  PuppeteerCapturer,
  PuppeteerCDPCapturer,
  RemoteChromeCapturer,
  RequestHandler
} = require('./lib/requestCapturers')

/**
 * @type {{WARCStreamTransform: WARCStreamTransform, AutoWARCParser: AutoWARCParser, WARCGzParser: WARCGzParser, WARCParser: WARCParser, ElectronWARCWriter: ElectronWARCGenerator, PuppeteerCDPWARCGenerator: PuppeteerCDPWARCGenerator, PuppeteerWARCGenerator: PuppeteerWARCGenerator, RemoteChromeWARCWriter: RemoteChromeWARCGenerator, WARCWriterBase: WARCWriterBase, RequestHandler: RequestHandler, ElectronCapturer: ElectronRequestCapturer, PuppeteerCapturer: PuppeteerRequestCapturer, PuppeteerCDPCapturer: PuppeteerCDPRequestCapturer, RemoteChromeCapturer: RemoteChromeRequestCapturer}}
 */
module.exports = {
  WARCStreamTransform,
  AutoWARCParser,
  WARCGzParser,
  WARCParser,
  ElectronWARCWriter,
  PuppeteerCDPWARCGenerator,
  PuppeteerWARCGenerator,
  RemoteChromeWARCWriter,
  WARCWriterBase,
  RequestHandler,
  ElectronCapturer,
  PuppeteerCapturer,
  PuppeteerCDPCapturer,
  RemoteChromeCapturer
}

module.exports.RequestLibWARCWriter = require('./lib/writers/requestLib')

if (require('./lib/parsers/_canUseRecordIterator')) {
  /**
   * @type {function(ReadStream|Gunzip): AsyncIterator<WARCRecord>}
   */
  module.exports.recordIterator = require('./lib/parsers/recordterator')
}
