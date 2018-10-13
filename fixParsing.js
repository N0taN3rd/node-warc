const splitter = require('./lib/parsers/splitter')
const fs = require('fs-extra')
const zlib = require('zlib')
const GzipDetector = require('./lib/parsers/gzipDetector')
const WFI = require('./lib/warcRecordBuilder/fieldIdentifiers')
const ContentParser = require('./lib/warcRecord/warcContentParsers')
const buildKeys = require('./lib/warcRecordBuilder/buildKeys')
const WARCRecorderBuilder = require('./lib/warcRecordBuilder')
const gzipped =
  '/home/john/PycharmProjects/pywb/collections/t/archive/youtube_embedded-20180722073428.warc.gz'
const reg = 'test/files/parseMe.warc'

const matcher = Buffer.from('\r\n')

async function createWARCReadStream (fp) {
  const isGzipped = await GzipDetector.isGzipped(fp)
  console.log(isGzipped)
  const stream = fs.createReadStream(fp)
  if (isGzipped) return stream.pipe(zlib.createGunzip())
  return stream
}

function firstMatch (buf, offset) {
  if (offset >= buf.length) return -1
  let i = offset
  while (i < buf.length) {
    if (buf[i] === matcher[0]) {
      if (matcher.length > 1) {
        let fullMatch = true
        let j = i
        let k = 0
        while (j < i + matcher.length) {
          if (buf[j] !== matcher[k]) {
            fullMatch = false
            break
          }
          j += 1
          k += 1
        }
        if (fullMatch) return j - matcher.length
      } else {
        break
      }
    }
    i += 1
  }
  return i + matcher.length - 1
}

async function * readWARC (readStream) {
  let buffered
  let offset, lastMatch, chunk, idx
  let lastBegin, buildKey, isEmptyLine, line
  let starting = true
  let checkRecType = false
  for await (chunk of readStream) {
    offset = 0
    lastMatch = 0
    if (buffered) {
      chunk = Buffer.concat([buffered, chunk])
      offset = buffered.length
      buffered = undefined
    }
    while (true) {
      idx = firstMatch(chunk, offset - matcher.length + 1)
      if (idx !== -1 && idx < chunk.length) {
        line = chunk.slice(lastMatch, idx)
        offset = idx + matcher.length
        lastMatch = offset
        yield line
      } else {
        buffered = chunk.slice(lastMatch)
        break
      }
    }
  }
  if (buffered) {
    yield buffered
  }
}

function isWARCRevisionLine (line) {
  if (line.length > 8) return false
  let len = WFI.begin.length
  let i = 1
  while (i < len) {
    if (WFI.begin[i] !== line[i]) return false
    i += 1
  }
  return true
}

const newContent = () => ({
  header: [],
  content1: [],
  content2: []
})

const parsingStates = {
  header: Symbol('warc-parsing-_header'),
  content1: Symbol('warc-parsing-content1'),
  content2: Symbol('warc-parsing-content2'),
  consumeCRLFHeader: Symbol('warc-parsing-comsume-crlf-_header'),
  consumeCRLFContent1: Symbol('warc-parsing-comsume-crlf-c1'),
  consumeCRLFContent2: Symbol('warc-parsing-comsume-crlf-c2')
}

const headerStates = {
  version: Symbol('warc-_header-version'),
  content: Symbol('warc-_header-content'),
  end: Symbol('warc-_header-end')
}

class CRLFCounter {
  constructor () {
    this.count = 0
  }

  increment () {
    this.count += 1
  }

  reset () {
    this.count = 0
  }
}

class RecordBuilder {
  constructor () {
    this._header = []
    this._recordHeader = null
    this._content1 = []
    this._content2 = []
    this._recordKey = buildKeys.builderKeyUnknown
  }

  determineWARCType () {
    this._recordHeader = ContentParser.parseWarcRecordHeader(this._header)
    console.log(this._recordHeader)
  }

  addToHeader (line) {
    this._header.push(line)
  }

  addToContent1 (line) {
    this._content1.push(line)
  }

  addToContent2 (line) {
    this._content2.push(line)
  }

  reset () {
    if (this._header.length > 0) {
      this._header = []
    }
    if (this._content1.length > 0) {
      this._content1 = []
    }
    if (this._content2.length > 0) {
      this._content2 = []
    }
  }
}

class WARCBuilderFSM {
  constructor () {
    this._parsingState = parsingStates.header
    this._prevState = this._parsingState
    this._crlfCounter = new CRLFCounter()
    this._recordBuilder = new RecordBuilder()
  }

  _consumeNonEmpty (line) {
    switch (this._parsingState) {
      case parsingStates.header:
        this._recordBuilder.addToHeader(line.toString())
        break
      case parsingStates.consumeCRLFHeader:
        if (!isWARCRevisionLine(line)) {
          this._crlfCounter.reset()
          this._recordBuilder.determineWARCType()
          this._prevState = this._parsingState
          this._parsingState = parsingStates.content1
          this._recordBuilder.addToContent1(line)
        } else {
          // build partial record of can
          console.log('got warc revision line @consumeCRLFHeader')
        }
        break
      case parsingStates.content1:
        // next state determined by warc type
        this._recordBuilder.addToContent1(line)
        break
      case parsingStates.consumeCRLFContent1:
        this._recordBuilder.addToContent2(line)
        break
      case parsingStates.content2:
        this._recordBuilder.addToContent2(line)
        // next state determined by warc type
        break
      case parsingStates.consumeCRLFContent2:
        break
    }
  }

  _consumeEmpty (line) {
    switch (this._parsingState) {
      case parsingStates.header:
        this._crlfCounter.increment()
        this._prevState = this._parsingState
        this._parsingState = parsingStates.consumeCRLFHeader
        break
      case parsingStates.consumeCRLFHeader:
        this._crlfCounter.increment()
        break
      case parsingStates.content1:
        // next state determined by warc type
        break
      case parsingStates.consumeCRLFContent1:
        this._crlfCounter.increment()
        break
      case parsingStates.content2:
        // next state determined by warc type
        break
      case parsingStates.consumeCRLFContent2:
        this._crlfCounter.increment()
        break
    }
  }

  consumeLine (line) {
    if (line.length > 0) {
      return this._consumeNonEmpty(line)
    }
    return this._consumeEmpty(line)
  }
}

function nextStateFromInfo (parsingState, empty, crlfCount) {
  switch (parsingState) {
    case parsingState.header:
    case parsingState.consumeCRLFHeader:
    case parsingState.content1:
    case parsingState.consumeCRLFContent1:
  }
}

function nextState (buildKey, parsingState, empty, crlfCount) {
  switch (buildKey) {
    case buildKeys.builderKeyInfo:
      break
    case buildKeys.builderKeyMdata:
      break
    case buildKeys.builderKeyReq:
      break
    case buildKeys.builderKeyRes:
      break
    case buildKeys.builderKeyRev:
      break
    case buildKeys.builderKeyResource:
      break
    case buildKeys.builderKeyUnknown:
      break
  }
}

async function doIt () {
  const readStream = await createWARCReadStream(reg)
  let line
  let pstate = parsingStates.header
  let conent = newContent()
  for await (line of readWARC(readStream)) {
    // console.log(line)
    if (isWARCRevisionLine(line)) {
      pstate = parsingStates.header
    }
    switch (pstate) {
      case parsingStates.header:
        if (line.length > 0) {
          conent.header.push(line.toString())
        } else {
          pstate = parsingStates.consumeCRLFHeader
        }
        break
      case parsingStates.consumeCRLFHeader:
        if (line.length > 0) {
          if (!isWARCRevisionLine(line)) {
            console.log(conent)
            conent = newContent()
            conent.content1.push(line)
            pstate = parsingStates.content1
          } else {
            // build partial record of can
            console.log(conent)
            conent = newContent()
            pstate = parsingStates.header
            console.log('@consumeCRLFHeader: got warc revision line')
          }
        } else {
          pstate = parsingStates.consumeCRLFHeader
        }
        break
      case parsingStates.content1:
        // next state determined by warc type
        if (line.length > 0) {
          if (!isWARCRevisionLine(line)) {
            conent.content1.push(line)
            pstate = parsingStates.content1
          } else {
            // build partial record of can
            pstate = parsingStates.header
            console.log('@consumeCRLFHeader: got warc revision line')
          }
        } else {
          pstate = parsingStates.consumeCRLFContent1
        }
        break
      case parsingStates.consumeCRLFContent1:
        // next state determined by warc type
        if (line.length > 0) {
          if (!isWARCRevisionLine(line)) {
            conent.content2.push(line)
            pstate = parsingStates.content2
          } else {
            // build partial record of can
            pstate = parsingStates.header
            console.log('@consumeCRLFHeader: got warc revision line')
          }
        } else {
          pstate = parsingStates.consumeCRLFContent1
        }
        break
      case parsingStates.content2:
        // next state determined by warc type
        if (line.length > 0) {
          if (!isWARCRevisionLine(line)) {
            conent.content2.push(line)
            pstate = parsingStates.content2
          } else {
            // build partial record of can
            pstate = parsingStates.header
            console.log('@consumeCRLFHeader: got warc revision line')
          }
        } else {
          pstate = parsingStates.consumeCRLFContent2
        }
        break
      case parsingStates.consumeCRLFContent2:
        if (line.length > 0) {
          if (isWARCRevisionLine(line)) {
            // build
            console.log(conent)
            conent = newContent()
            conent.header.push(line)
            pstate = parsingStates.header
          } else {
            // build partial record of can
            console.log('@consumeCRLFContent2: got non-warc revision line')
            pstate = parsingStates.header
          }
        } else {
          pstate = parsingStates.consumeCRLFContent2
        }
        break
      default:
        console.log(pstate)
        break
    }
    // if (line.length > 0) {
    //   switch (pstate) {
    //     case parsingStates.header:
    //       header.push(line.toString())
    //       break
    //     case parsingStates.consumeCRLFHeader:
    //       if (!isWARCRevisionLine(line)) {
    //         this._crlfCounter.reset()
    //         this._recordBuilder.determineWARCType()
    //         this._prevState = this._parsingState
    //         this._parsingState = parsingStates.content1
    //         this._recordBuilder.addToContent1(line)
    //       } else {
    //         // build partial record of can
    //         console.log('got warc revision line @consumeCRLFHeader')
    //       }
    //       break
    //     case parsingStates.content1:
    //       // next state determined by warc type
    //       break
    //     case parsingStates.consumeCRLFContent1:
    //       break
    //     case parsingStates.content2:
    //       // next state determined by warc type
    //       break
    //     case parsingStates.consumeCRLFContent2:
    //       break
    //   }
    // } else {
    //   switch (pstate) {
    //     case parsingStates.header:
    //       pstate = parsingStates.consumeCRLFHeader
    //       break
    //     case parsingStates.consumeCRLFHeader:
    //       break
    //     case parsingStates.content1:
    //       // next state determined by warc type
    //       break
    //     case parsingStates.consumeCRLFContent1:
    //       break
    //     case parsingStates.content2:
    //       // next state determined by warc type
    //       break
    //     case parsingStates.consumeCRLFContent2:
    //       break
    //   }
    // }
  }
  // await new Promise(r => readStream.end(r))
}

doIt().catch(error => console.error(error))
//
// const endings = {
//   slashR: 0x0d,
//   slashN: 0x0a
// }
// console.log(Buffer.from('\r\n'))

