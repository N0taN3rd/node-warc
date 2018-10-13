/**
 * @desc Buffers from hex strings representing the a WARC records WARC-TYPE or record/record-section separator
 * as seen by the parser. Due to the large size of WARC files and the binary data contained within it is more efficient
 * to parse the files contents looking for these sentinels than converting the buffer to an UTF-8 string first
 * @type {{begin: Buffer, info: Buffer, mdata: Buffer, req: Buffer, res: Buffer, revisit: Buffer, resource: Buffer crlf: Buffer, empty: Buffer}}
 */
const fieldIdentifiers = {
  begin: Buffer.from('574152432f', 'hex'),
  info: Buffer.from('574152432d547970653a2077617263696e666f', 'hex'),
  mdata: Buffer.from('574152432d547970653a206d65746164617461', 'hex'),
  req: Buffer.from('574152432d547970653a2072657175657374', 'hex'),
  res: Buffer.from('574152432d547970653a20726573706f6e7365', 'hex'),
  revisit: Buffer.from('574152432d547970653a2072657669736974', 'hex'),
  resource: Buffer.from('574152432d547970653a207265736f75726365', 'hex'),
  crlf: Buffer.from('0d0a', 'hex'),
  empty: Buffer.from('0d', 'hex')
}

/**
 * @type {{begin: Buffer, info: Buffer, mdata: Buffer, req: Buffer, res: Buffer, revisit: Buffer, resource: Buffer, crlf: Buffer, empty: Buffer}}
 */
module.exports = fieldIdentifiers
