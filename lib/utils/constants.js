/**
 * @type {Set<string>}
 */
const canReplayProtocols = new Set([
  'HTTP/0.9',
  'HTTP/1.0',
  'HTTP/1.1',
  'DATA',
  'data'
])

/**
 * @type {{canReplayProtocols: Set<string>, SPACE: string, H2Method: string, HTTP1D1: string, DASH: string, H2path: string}}
 */
module.exports = {
  canReplayProtocols,
  SPACE: ' ',
  H2Method: ':method',
  H2path: ':path',
  HTTP1D1: 'HTTP/1.1',
  DASH: '-'
}
