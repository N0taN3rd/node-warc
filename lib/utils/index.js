const {
  stringifyHeaders,
  stringifyRequestHeaders
} = require('./headerSerializers')

/**
 * @type {{isEmptyPlainObject: function(object: ?Object): boolean, getResBodyElectron: function(requestId: string, wcDebugger: Object): Promise<Buffer>, stringifyHeaders: function(headers: Object): string, stringifyRequestHeaders: function(reqHeaders: Object, host: string): string, constants: {canReplayProtocols: Set<string>, SPACE: string, H2Method: string, HTTP1D1: string, DASH: string, H2path: string}, ElectronGetResError: ElectronGetResError}}
 */
module.exports = {
  isEmptyPlainObject: require('./isEmptyPlainObject'),
  getResBodyElectron: require('./getResBodyElectron'),
  stringifyHeaders,
  stringifyRequestHeaders,
  constants: require('./constants'),
  ElectronGetResError: require('./electronGetResError')
}
