const {
  stringifyHeaders,
  stringifyRequestHeaders
} = require('./headerSerializers')

/**
 * @type {function(object: ?Object): boolean}
 */
exports.isEmptyPlainObject = require('./isEmptyPlainObject')

/**
 * @type {function(requestId: string, wcDebugger: Object): Promise<Buffer>}
 */
exports.getResBodyElectron = require('./getResBodyElectron')

/**
 * @type {function(headers: Object): string}
 */
exports.stringifyHeaders = stringifyHeaders

/**
 * @type {function(reqHeaders: Object, host: string): string}
 */
exports.stringifyRequestHeaders = stringifyRequestHeaders

/**
 * @type {{canReplayProtocols: Set<string>, SPACE: string, H2Method: string, HTTP1D1: string, DASH: string, H2path: string}}
 */
exports.constants = require('./constants')

/**
 * @type {ElectronGetResError}
 */
exports.ElectronGetResError = require('./electronGetResError')
