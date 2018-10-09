const WARCRecord = require('./index')
const WFI = require('./fieldIdentifiers')

const CRLF = WFI.crlf
const WARCBegin = WFI.begin

const parsingStates = {
  header: Symbol('warc-parsing-_header'),
  content1: Symbol('warc-parsing-content1'),
  content2: Symbol('warc-parsing-content2'),
  consumeCRLFHeader: Symbol('warc-parsing-comsume-crlf-_header'),
  consumeCRLFContent1: Symbol('warc-parsing-comsume-crlf-c1'),
  consumeCRLFContent2: Symbol('warc-parsing-comsume-crlf-c2')
}

const WFIBeginLen = WARCBegin.length

function isJustCRLF (line) {
  if (line.length !== 2) return false
  return line[0] === CRLF[0] && line[1] === CRLF[1]
}

function isWARCRevisionLine (line) {
  if (line.length > 11) return false
  let i = 0
  while (i < WFIBeginLen) {
    if (WARCBegin[i] !== line[i]) return false
    i += 1
  }
  return true
}

class RecordBuilder {
  constructor () {
    /**
     * @type {{header: Buffer[], c1: Buffer[], c2: Buffer[]}}
     * @private
     */
    this._parts = {
      header: [],
      c1: [],
      c2: []
    }
    this._parsingState = parsingStates.beginning
  }

  /**
   * @returns {?WARCRecord}
   * @private
   */
  _buildRecord () {
    if (this._parts.header.length === 0) return null
    const newRecord = new WARCRecord(this._parts)
    this._parts.header = []
    this._parts.c1 = []
    this._parts.c2 = []
    return newRecord
  }

  /**
   * @param {Buffer} line
   * @returns {?WARCRecord}
   */
  consumeLine (line) {
    let newRecord = null
    if (isWARCRevisionLine(line)) {
      this._parsingState = parsingStates.header
      newRecord = this._buildRecord()
    }
    const isSep = isJustCRLF(line)
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

/**
 * @type {RecordBuilder}
 */
module.exports = RecordBuilder
