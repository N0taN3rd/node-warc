'use strict'
const WARCRecord = require('./record')
const { crlf, begin } = require('./fieldIdentifiers')

/**
 * @type {{header: symbol, content1: symbol, content2: symbol, consumeCRLFHeader: symbol, consumeCRLFContent1: symbol, consumeCRLFContent2: symbol}}
 */
const parsingStates = {
  header: Symbol('warc-parsing-header'),
  content1: Symbol('warc-parsing-content1'),
  content2: Symbol('warc-parsing-content2'),
  consumeCRLFHeader: Symbol('warc-parsing-comsume-crlf-header'),
  consumeCRLFContent1: Symbol('warc-parsing-comsume-crlf-c1'),
  consumeCRLFContent2: Symbol('warc-parsing-comsume-crlf-c2')
}

/**
 * @type {number}
 */
const WFIBeginLen = begin.length

/**
 * @param {Buffer} line
 * @returns {boolean}
 */
function isJustCRLF (line) {
  if (line.length !== 2) return false
  return line[0] === crlf[0] && line[1] === crlf[1]
}

/**
 * @param {Buffer} line
 * @returns {boolean}
 */
function isWARCRevisionLine (line) {
  if (line.length > 11) return false
  let i = 0
  while (i < WFIBeginLen) {
    if (begin[i] !== line[i]) return false
    i += 1
  }
  return true
}

/**
 * @desc Progressively builds warc records by consuming the file line by line
 */
class RecordBuilder {
  /**
   * @desc Create a new RecordBuilder
   */
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

    /**
     * @type {symbol}
     * @private
     */
    this._parsingState = parsingStates.header
  }

  /**
   * @desc Returns a new WARC record if one can be created otherwise returns null
   * @returns {?WARCRecord}
   */
  buildRecord () {
    if (this._parts.header.length === 0) return null
    const newRecord = new WARCRecord(this._parts)
    this._parts.header = []
    this._parts.c1 = []
    this._parts.c2 = []
    return newRecord
  }

  /**
   * @desc Consumes a line of a WARC file.
   * If a record can be built this function returns a new WARCRecord otherwise null
   * @param {Buffer} line - The line to be consumed
   * @returns {?WARCRecord}
   */
  consumeLine (line) {
    let newRecord = null
    if (isWARCRevisionLine(line)) {
      this._parsingState = parsingStates.header
      newRecord = this.buildRecord()
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
