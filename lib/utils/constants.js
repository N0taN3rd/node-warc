const canReplayProtocols = new Set(['HTTP/0.9', 'HTTP/1.0', 'HTTP/1.1', 'DATA', 'data'])

/**
 * @type {{canReplayProtocols: Set, SPACE: string, H2Method: string}}
 */
module.exports = {
  canReplayProtocols,
  SPACE: ' ',
  H2Method: ':method',
  HTTP1D1: 'HTTP/1.1'
}
