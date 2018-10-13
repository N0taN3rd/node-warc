'use strict'
const fs = require('fs-extra')
const zlib = require('zlib')
const GzipDetector = require('./lib/parsers/gzipDetector')
const WFI = require('./lib/warcRecord/fieldIdentifiers')
const ContentParser = require('./lib/warcRecord/warcContentParsers')
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
   * @param {{header: Buffer[], c1: Buffer[], c2: Buffer[]}} warcParts
   */
  constructor (warcParts) {
    /**
     * @type {Object}
     */
    this.warcHeader = ContentParser.parseWarcRecordHeader(warcParts.header)
    this.httpInfo = null
    this.content = null
    const wt = this.warcType
    switch (wt) {
      case WARCTypes.request:
      case WARCTypes.response:
      case WARCTypes.revisit:
        this.httpInfo = ContentParser.parseHTTPPortion(
          warcParts.c1,
          wt === WARCTypes.request
        )
        this.content = Buffer.concat(warcParts.c2 || [])
        break
      case WARCTypes.warcinfo:
      case WARCTypes.metadata:
        this.content = ContentParser.parseWarcInfoMetaDataContent(warcParts.c1)
        break
      default:
        this.content = Buffer.concat(warcParts.c1 || [])
        break
    }
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
  if (line.length !== 2) return false
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
    const newRecord = new WARCRecord(this._parts)
    this._parts.header = []
    this._parts.c1 = []
    this._parts.c2 = []
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
    }
    return newRecord
  }
}

async function * readWARC2 (readStream) {
  let buffered
  let offset, lastMatch, chunk, idx, nextChunk
  let mlengh = matcher.length
  let chunkLen
  let chunkIter = readStream[Symbol.asyncIterator]()
  while (true) {
    nextChunk = await chunkIter.next()
    if (nextChunk.done) break
    offset = 0
    lastMatch = 0
    if (buffered) {
      chunk = Buffer.concat(
        [buffered, nextChunk.value],
        buffered.length + nextChunk.value.length
      )
      buffered = undefined
    } else {
      chunk = nextChunk.value
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

  if (buffered != null && buffered.length > 0) {
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

const warcRecordIterator = require('./lib/parsers/asyncParser')

async function doIt () {
  // const builder = new RecordBuilder()
  let record
  for await (record of warcRecordIterator(
    fs.createReadStream(gzipped).pipe(zlib.createGunzip())
  )) {
    console.log(record)
    console.log('---------------------')
  }
  // console.log(builder.buildRecord())
  // const rec =
  // await fs.writeFile('it.gif', Buffer.concat(rec.c2))
  // await new Promise(r => readStream.end(r))
}

// doIt().catch(error => console.error(error))
//
// console.log(Buffer.from('WARC/0.18\r\n').length)

const WARCInitOpts = {
  appending: false,
  gzip: process.env.NODEWARC_WRITE_GZIPPED != null
}

function dummy (opts = {}) {
  const options = { ...opts, ...WARCInitOpts }
  console.log(options)
}

dummy({ gzip: true })
