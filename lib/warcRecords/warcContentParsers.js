/**
 * @desc Capture ``(key):\s(value)`` separated pairs
 * @type {RegExp}
 */
const headerRe = /([^:]+):\s(.+)/

/**
 * @desc Capture the WARC Record Id or WARC Concurrent To Id
 * @type {RegExp}
 */
const recIdRE = /<[a-z]+:[a-z]+:([^>]+)>/

/**
 * @desc Parse a WARC Records headers not HTTP Header parser
 * @param {Buffer[]} bufs the WARC Records header lines
 * @return {Object}
 */
function parseWarcRecordHeader (bufs) {
  let rheader = {}
  let len = bufs.length
  let i = 1
  let line
  let match
  let str, m1, m2, ignored, id
  line = bufs[0].toString('utf8').trim()
  rheader['WARC'] = line.slice(line.indexOf('/') + 1)
  while (i < len) {
    line = bufs[i].toString('utf8').trim()
    match = headerRe.exec(line)
    if (match) {
      ;[str, m1, m2] = match
      if (m1 === 'WARC-Record-ID' || m1 === 'WARC-Concurrent-To') {
        ;[ignored, id] = recIdRE.exec(m2)
        rheader[m1] = id
      } else if (m1 === 'Content-Length') {
        rheader[m1] = parseInt(m2)
      } else {
        rheader[m1] = m2
      }
    }
    i += 1
  }
  return rheader
}

/**
 * @desc Parse a WARC Metadata records metadata content
 * @param {Buffer[]} bufs the WARC Metadata records content lines
 * @return {Object}
 */
function parseWarcInfoMetaDataContent (bufs) {
  let content = {}
  let len = bufs.length
  let i = 0
  let line
  let match
  let str, m1, m2
  while (i < len) {
    line = bufs[i].toString('utf8').trim()
    match = headerRe.exec(line)
    if (match) {
      ;[str, m1, m2] = match
      if (m1 === 'outlink') {
        if (!content[m1]) {
          content[m1] = []
        }
        content[m1].push(m2)
      } else {
        content[m1] = m2
      }
    } else {
      content[line] = ''
    }
    i += 1
  }
  return content
}

module.exports = {
  headerRe,
  recIdRE,
  parseWarcInfoMetaDataContent,
  parseWarcRecordHeader
}
