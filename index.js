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

/**
 * @type {AutoWARCParser}
 */
exports.AutoWARCParser = AutoWARCParser

/**
 * @type {CRIExtraRequestCapturer}
 */
exports.CRIExtraCapturer = CRIExtraCapturer

/**
 * @type {CRIExtraWARCGenerator}
 */
exports.CRIExtraWARCGenerator = CRIExtraWARCGenerator

/**
 * @type {ElectronRequestCapturer}
 */
exports.ElectronCapturer = ElectronCapturer

/**
 * @type {ElectronWARCGenerator}
 */
exports.ElectronWARCWriter = ElectronWARCWriter

/**
 * @type {PuppeteerCDPRequestCapturer}
 */
exports.PuppeteerCDPCapturer = PuppeteerCDPCapturer

/**
 * @type {PuppeteerCDPWARCGenerator}
 */
exports.PuppeteerCDPWARCGenerator = PuppeteerCDPWARCGenerator

/**
 * @type {PuppeteerRequestCapturer}
 */
exports.PuppeteerCapturer = PuppeteerCapturer

/**
 * @type {PuppeteerWARCGenerator}
 */
exports.PuppeteerWARCGenerator = PuppeteerWARCGenerator

/**
 * @type {RemoteChromeRequestCapturer}
 */
exports.RemoteChromeCapturer = RemoteChromeCapturer

/**
 * @type {RemoteChromeWARCGenerator}
 */
exports.RemoteChromeWARCWriter = RemoteChromeWARCWriter

/**
 * @type {RequestHandler}
 */
exports.RequestHandler = RequestHandler

/**
 * @type {WARCGzParser}
 */
exports.WARCGzParser = WARCGzParser

/**
 * @type {WARCParser}
 */
exports.WARCParser = WARCParser

/**
 * @type {WARCStreamTransform}
 */
exports.WARCStreamTransform = WARCStreamTransform

/**
 * @type {WARCWriterBase}
 */
exports.WARCWriterBase = WARCWriterBase

/**
 * @type {RequestLibWARCGenerator}
 */
exports.RequestLibWARCWriter = require('./lib/writers/requestLib')

if (require('./lib/parsers/_canUseRecordIterator')) {
  /**
   * @type {function(ReadStream): AsyncIterator<WARCRecord>}
   */
  exports.recordIterator = require('./lib/parsers/recordterator')
}
