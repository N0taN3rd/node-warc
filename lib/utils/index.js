const {
  stringifyHeaders,
  stringifyRequestHeaders
} = require('./headerSerializers')

exports.isEmptyPlainObject = require('./isEmptyPlainObject')
exports.getResBodyElectron = require('./getResBodyElectron')
exports.stringifyHeaders = stringifyHeaders
exports.stringifyRequestHeaders = stringifyRequestHeaders

/**
 * @type {{canReplayProtocols: Set<string>, SPACE: string, H2Method: string, HTTP1D1: string, DASH: string, H2path: string}}
 */
exports.constants = require('./constants')

exports.ElectronGetResError = require('./electronGetResError')

exports.ensureWARCFilename = require('./ensureWARCFilename')
