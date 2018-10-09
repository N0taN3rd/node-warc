const splitter = require('./lib/parsers/splitter')
const fs = require('fs-extra')
const zlib = require('zlib')
const GzipDetector = require('./lib/parsers/gzipDetector')
const WFI = require('./lib/warcRecordBuilder/fieldIdentifiers')
const ContentParser = require('./lib/warcRecords/warcContentParsers')
const buildKeys = require('./lib/warcRecordBuilder/buildKeys')
const WARCRecorderBuilder = require('./lib/warcRecordBuilder')
const gzipped =
  '/home/john/WebstormProjects/node-warc/yt-working-20180702161433.warc.gz'
const reg = 'test/files/parseMe.warc'

const matcher = Buffer.from('\r\n')

async function createWARCReadStream (fp) {
  const isGzipped = await GzipDetector.isGzipped(fp)
  console.log(isGzipped)
  const stream = fs.createReadStream(fp)
  if (isGzipped) return stream.pipe(zlib.createGunzip())
  return stream
}

const WFIBeginLen = WFI.begin.length

function isWARCRevisionLine (line) {
  if (line.length > 11) return false
  let i = 0
  while (i < WFIBeginLen) {
    if (WFI.begin[i] !== line[i]) return false
    i += 1
  }
  return true
}
const parsingStates = {
  header: Symbol('warc-parsing-_header'),
  content1: Symbol('warc-parsing-content1'),
  content2: Symbol('warc-parsing-content2'),
  consumeCRLFHeader: Symbol('warc-parsing-comsume-crlf-_header'),
  consumeCRLFContent1: Symbol('warc-parsing-comsume-crlf-c1'),
  consumeCRLFContent2: Symbol('warc-parsing-comsume-crlf-c2')
}

const WARCTypes = {
  warcinfo: 'warcinfo',
  metadata: 'metadata',
  request: 'request',
  response: 'response',
  revisit: 'revisit',
  resource: 'resource',
  conversion: 'conversion',
  unknown: 'unknown',
  continuation: 'continuation'
}

class WARCRecord {
  /**
   * @desc Create a new WARCRecord
   * @param {Buffer[]} header - warc header field buffers
   * @param {Buffer[]} c1 content1 buffers
   * @param {Buffer[]} c2 content2 buffers
   */
  constructor (header, c1, c2) {
    /**
     * @type {Object}
     */
    this.warcHeader = ContentParser.parseWarcRecordHeader(header)
    this.httpInfo = null
    this.contentBuffer = null
    const wt = this.warcType
    switch (wt) {
      case WARCTypes.request:
        this.httpInfo = ContentParser.parseReqHTTP(c1)
        break
      case WARCTypes.response:
      case WARCTypes.revisit:
        this.httpInfo = ContentParser.parseResHTTP(c1)
        break
    }
    this.contentBuffer = Buffer.concat(c2 || [])
  }

  /**
   * @param {!string} headerKey
   * @return {boolean}
   */
  hasWARCHeader (headerKey) {
    if (!headerKey.startsWith('WARC')) {
      headerKey = `WARC-${headerKey}`
    }
    return this.warcHeader[headerKey] != null
  }

  /**
   * @param {!string} headerKey
   * @return {?string}
   */
  getWARCHeader (headerKey) {
    if (!headerKey.startsWith('WARC')) {
      headerKey = `WARC-${headerKey}`
    }
    return this.warcHeader[headerKey]
  }

  /**
   * @return {?string}
   */
  get warcType () {
    return this.warcHeader['WARC-Type']
  }

  /**
   * @return {?string}
   */
  get warcRecordID () {
    return this.warcHeader['WARC-Record-ID']
  }

  /**
   * @return {?string}
   */
  get warcDate () {
    return this.warcHeader['WARC-Date']
  }

  /**
   * @return {?string}
   */
  get warcContentLength () {
    return this.warcHeader['Content-Length']
  }

  /**
   * @return {?string}
   */
  get warcContentType () {
    return this.warcHeader['Content-Type']
  }

  /**
   * @return {?string}
   */
  get warcConcurrentTo () {
    return this.warcHeader['WARC-Concurrent-To']
  }

  /**
   * @return {?string}
   */
  get warcBlockDigest () {
    return this.warcHeader['WARC-Block-Digest']
  }

  /**
   * @return {?string}
   */
  get warcPayloadDigest () {
    return this.warcHeader['WARC-Payload-Digest']
  }

  /**
   * @return {?string}
   */
  get warcIPAddress () {
    return this.warcHeader['WARC-IP-Address']
  }

  /**
   * @return {?string}
   */
  get warcRefersTo () {
    return this.warcHeader['WARC-Refers-To']
  }

  /**
   * @return {?string}
   */
  get warcRefersToTargetURI () {
    return this.warcHeader['WARC-Refers-To-Target-URI']
  }

  /**
   * @return {?string}
   */
  get warcRefersToDate () {
    return this.warcHeader['WARC-Refers-To-Date']
  }

  /**
   * @return {?string}
   */
  get warcTargetURI () {
    return this.warcHeader['WARC-Target-URI']
  }

  /**
   * @return {?string}
   */
  get warcTruncated () {
    return this.warcHeader['WARC-Truncated']
  }

  /**
   * @return {?string}
   */
  get warcWarcinfoID () {
    return this.warcHeader['WARC-Warcinfo-ID']
  }

  /**
   * @return {?string}
   */
  get warcFilename () {
    return this.warcHeader['WARC-Filename']
  }

  /**
   * @return {?string}
   */
  get warcProfile () {
    return this.warcHeader['WARC-Profile']
  }

  /**
   * @return {?string}
   */
  get warcIdentifiedPayloadType () {
    return this.warcHeader['WARC-Identified-Payload-Type']
  }

  /**
   * @return {?string}
   */
  get warcSegmentOriginID () {
    return this.warcHeader['WARC-Segment-Origin-ID']
  }

  /**
   * @return {?string}
   */
  get warcSegmentNumber () {
    return this.warcHeader['WARC-Segment-Number']
  }

  /**
   * @return {?string}
   */
  get warcSegmentTotalLength () {
    return this.warcHeader['WARC-Segment-Total-Length']
  }
}

const SEP = Buffer.from('\r\n')

function isJustWSep (line) {
  if (line.length > 2) return false
  return line[0] === SEP[0] && line[1] === SEP[1]
}

class RecordBuilder {
  constructor () {
    this._parts = {
      header: [],
      c1: [],
      c2: []
    }
    this._parsingState = parsingStates.beginning
  }

  _buildRecord () {
    if (this._parts.header.length === 0) return null
    const newRecord = new WARCRecord(
      this._parts.header,
      this._parts.c1,
      this._parts.c2
    )
    this._parts = {
      header: [],
      c1: [],
      c2: []
    }
    return newRecord
  }

  consumeLine (line) {
    let newRecord = null
    if (isWARCRevisionLine(line)) {
      this._parsingState = parsingStates.header
      newRecord = this._buildRecord()
    }
    const isSep = isJustWSep(line)
    switch (this._parsingState) {
      case parsingStates.header:
        if (!isSep) {
          this._parts.header.push(line)
        } else {
          this._parsingState = parsingStates.consumeCRLFHeader
        }
        break
      case parsingStates.consumeCRLFHeader:
        if (!isSep) {
          this._parts.c1.push(line)
          this._parsingState = parsingStates.content1
        }
        break
      case parsingStates.content1:
        if (!isSep) {
          this._parts.c1.push(line)
        } else {
          this._parsingState = parsingStates.consumeCRLFContent1
        }
        break
      case parsingStates.consumeCRLFContent1:
        if (!isSep) {
          this._parts.c2.push(line)
          this._parsingState = parsingStates.content2
        }
        break
      case parsingStates.content2:
        if (!isSep) {
          this._parts.c2.push(line)
        } else {
          this._parsingState = parsingStates.consumeCRLFContent2
        }
        break
      case parsingStates.consumeCRLFContent2:
        break
      default:
        console.log(this._parsingState)
        break
    }
    return newRecord
  }
}

function matchIndexFrom (buffer, offset) {
  if (offset >= buffer.length) return -1
  return buffer.indexOf(matcher, offset)
}

async function * readWARC2 (readStream) {
  let buffered
  let offset, lastMatch, chunk, idx
  let mlengh = matcher.length
  let chunkLen
  for await (chunk of readStream) {
    offset = 0
    lastMatch = 0
    if (buffered) {
      chunk = Buffer.concat([buffered, chunk])
      buffered = undefined
    }
    chunkLen = chunk.length
    while (true) {
      idx = offset >= chunkLen ? -1 : chunk.indexOf(matcher, offset)
      if (idx !== -1 && idx < chunk.length) {
        yield chunk.slice(lastMatch, idx + mlengh)
        offset = idx + mlengh
        lastMatch = offset
      } else {
        buffered = chunk.slice(lastMatch)
        break
      }
    }
  }

  if (buffered && buffered.length > 0) {
    offset = 0
    lastMatch = 0
    chunkLen = buffered.length
    while (true) {
      idx = offset >= chunkLen ? -1 : buffered.indexOf(matcher, offset)
      if (idx !== -1 && idx < buffered.length) {
        yield buffered.slice(lastMatch, idx + mlengh)
        offset = idx + mlengh
        lastMatch = offset
      } else {
        yield buffered.slice(lastMatch)
        break
      }
    }
  }
}

async function doIt () {
  const readStream = await createWARCReadStream(gzipped)
  let line
  const builder = new RecordBuilder()
  for await (line of readWARC2(readStream)) {
    let newRecord = builder.consumeLine(line)
    if (newRecord != null) {
      console.log(newRecord)
    }
  }
  console.log(builder._buildRecord())
  // const rec =
  // await fs.writeFile('it.gif', Buffer.concat(rec.c2))
  // await new Promise(r => readStream.end(r))
}

doIt().catch(error => console.error(error))
//
// console.log(Buffer.from('WARC/0.18\r\n').length)