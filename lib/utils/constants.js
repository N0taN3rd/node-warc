const canReplayProtocols = new Set(['HTTP/0.9', 'HTTP/1.0', 'HTTP/1.1', 'DATA'])

module.exports = {
  canReplayProtocols,
  SPACE: ' ',
  H2Method: ':method'
}
