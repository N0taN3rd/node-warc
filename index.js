'use strict'
const {
  WARCStreamTransform,
  AutoWARCParser,
  WARCGzParser,
  WARCParser
} = require('./lib/parsers')

const {
  CRIExtraWARCGenerator,
  ElectronWARCWriter,
  PuppeteerCDPWARCGenerator,
  PuppeteerWARCGenerator,
  RemoteChromeWARCWriter,
  WARCWriterBase
} = require('./lib/writers')

const {
  CRIExtraCapturer,
  ElectronCapturer,
  PuppeteerCapturer,
  PuppeteerCDPCapturer,
  RemoteChromeCapturer,
  RequestHandler
} = require('./lib/requestCapturers')

exports.AutoWARCParser = AutoWARCParser

exports.CRIExtraCapturer = CRIExtraCapturer

exports.CRIExtraWARCGenerator = CRIExtraWARCGenerator

exports.ElectronCapturer = ElectronCapturer

exports.ElectronWARCWriter = ElectronWARCWriter

exports.PuppeteerCDPCapturer = PuppeteerCDPCapturer

exports.PuppeteerCDPWARCGenerator = PuppeteerCDPWARCGenerator

exports.PuppeteerCapturer = PuppeteerCapturer

exports.PuppeteerWARCGenerator = PuppeteerWARCGenerator

exports.RemoteChromeCapturer = RemoteChromeCapturer

exports.RemoteChromeWARCWriter = RemoteChromeWARCWriter

exports.RequestHandler = RequestHandler

exports.WARCGzParser = WARCGzParser

exports.WARCParser = WARCParser

exports.WARCStreamTransform = WARCStreamTransform

exports.WARCWriterBase = WARCWriterBase

exports.RequestLibWARCWriter = require('./lib/writers/requestLib')

if (require('./lib/parsers/_canUseRecordIterator')) {
  /**
   * @type {function(ReadStream): AsyncIterator<WARCRecord>}
   */
  exports.recordIterator = require('./lib/parsers/recordterator')
}
