'use strict'
const {
  WARCStreamTransform,
  AutoWARCParser,
  WARCGzParser,
  WARCParser
} = require('./parsers')

const {
  ElectronWARCWriter,
  PuppeteerCDPWARCGenerator,
  PuppeteerWARCGenerator,
  RemoteChromeWARCWriter,
  WARCWriterBase
} = require('./writers')

const {
  ElectronCapturer,
  PuppeteerCapturer,
  PuppeteerCDPCapturer,
  RemoteChromeCapturer
} = require('./requestCapturers')

/**
 * @type {WARCStreamTransform}
 */
exports.WARCStreamTransform = WARCStreamTransform

/**
 * @type {AutoWARCParser}
 */
exports.AutoWARCParser = AutoWARCParser

/**
 * @type {WARCGzParser}
 */
exports.WARCGzParser = WARCGzParser

/**
 * @type {WARCParser}
 */
exports.WARCParser = WARCParser

/**
 * @type {ElectronWARCGenerator}
 */
exports.ElectronWARCWriter = ElectronWARCWriter

/**
 * @type {PuppeteerCDPWARCGenerator}
 */
exports.PuppeteerCDPWARCGenerator = PuppeteerCDPWARCGenerator

/**
 * @type {PuppeteerWARCGenerator}
 */
exports.PuppeteerWARCGenerator = PuppeteerWARCGenerator

/**
 * @type {RemoteChromeWARCGenerator}
 */
exports.RemoteChromeWARCWriter = RemoteChromeWARCWriter

/**
 * @type {WARCWriterBase}
 */
exports.WARCWriterBase = WARCWriterBase

/**
 * @type {ElectronRequestCapturer}
 */
exports.ElectronCapturer = ElectronCapturer

/**
 * @type {PuppeteerRequestCapturer}
 */
exports.PuppeteerCapturer = PuppeteerCapturer

/**
 * @type {PuppeteerCDPRequestCapturer}
 */
exports.PuppeteerCDPCapturer = PuppeteerCDPCapturer

/**
 * @type {RemoteChromeRequestCapturer}
 */
exports.RemoteChromeCapturer = RemoteChromeCapturer
