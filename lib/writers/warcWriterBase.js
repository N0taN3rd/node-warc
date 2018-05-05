/** @ignore */
const fs = require('fs-extra')
/** @ignore */
const Path = require('path')
/** @ignore */
const uuid = require('uuid/v1')
const EventEmitter = require('eventemitter3')
const {
  warcHeader,
  warcHeaderContent,
  warcRequestHeader,
  warcResponseHeader,
  warcMetadataHeader,
  recordSeparator,
  CRLF
} = require('./warcFields')
/** @ignore */
const recordSeparatorBuffer = Buffer.from(recordSeparator)
/** @ignore */
const CRLFBuffer = Buffer.from(CRLF)

/**
 * @extends EventEmitter3
 * @desc The base class of {@link ElectronWARCGenerator} and {@link RemoteChromeWARCGenerator}
 */
class WARCWriterBase extends EventEmitter {
  /**
   * @desc Create a new WARCWriter
   */
  constructor () {
    super()
    this._warcOutStream = null
    this._lastError = null
    this._rid = null
    this._now = null
    this._fileName = null
    this._wid = null
    this._version = '2.0.0rc2'
    this._onFinish = this._onFinish.bind(this)
    this._onError = this._onError.bind(this)
  }

  /**
   * @desc Initialize the writer
   * @param {string} warcPath - the path for the WARC file to be written
   * @param {boolean} [appending=false] appending - append to a previously created WARC file
   */
  initWARC (warcPath, appending = false) {
    if (appending) {
      this._warcOutStream = fs.createWriteStream(warcPath, {flags: 'a'})
    } else {
      this._warcOutStream = fs.createWriteStream(warcPath)
    }
    this._warcOutStream.on('finish', this._onFinish)
    this._warcOutStream.on('error', this._onError)
    let now = new Date().toISOString()
    this._now = now.substr(0, now.indexOf('.')) + 'Z'
    this._rid = uuid()
    this._fileName = Path.basename(warcPath)
  }

  /**
   * @desc Write out the WARC-Type: info records
   * @param {string} isPartOfV
   * @param {string} warcInfoDescription
   * @param {string} ua user agent
   * @return {Promise<void>}
   */
  writeWarcInfoRecord (isPartOfV, warcInfoDescription, ua) {
    this._wid = uuid()
    let whct = Buffer.from(warcHeaderContent({
      version: this._version,
      isPartOfV,
      warcInfoDescription,
      ua
    }))
    let whc = Buffer.from(`${CRLF}${whct}${CRLF}`, 'utf8')
    let wh = Buffer.from(warcHeader({
      now: this._now,
      filename: this._fileName,
      len: whc.length,
      rid: this._wid
    }))
    return this.writeRecordBlock(
      Buffer.concat([wh, whc, recordSeparatorBuffer]))
  }

  /**
   * @desc Write WARC-Type: metadata for outlinks
   * @param {string} targetURI
   * @param {string} outlinks
   * @return {Promise<void>}
   */
  writeWarcMetadataOutlinks (targetURI, outlinks) {
    let wmhc = Buffer.from(`${CRLF}${outlinks}${CRLF}`, 'utf8')
    let wmh = Buffer.from(warcMetadataHeader({
      targetURI,
      now: this._now,
      len: wmhc.length,
      concurrentTo: this._rid,
      rid: uuid()
    }))
    return this.writeRecordBlock(
      Buffer.concat([wmh, wmhc, recordSeparatorBuffer]))
  }

  /**
   * @desc Write A Request Record
   * @param {string} targetURI
   * @param {string} httpHeaderString
   * @param {string|Buffer?} requestData
   * @return {Promise<void>}
   */
  writeRequestRecord (targetURI, httpHeaderString, requestData) {
    let reqHeadContentBuffer
    if (requestData !== null && requestData !== undefined) {
      reqHeadContentBuffer = Buffer.from(
        `${CRLF}${httpHeaderString}${requestData}${CRLF}`, 'utf8')
    } else {
      reqHeadContentBuffer = Buffer.from(`${CRLF}${httpHeaderString}`, 'utf8')
    }
    let reqWHeader = Buffer.from(warcRequestHeader({
      targetURI,
      concurrentTo: this._rid,
      now: this._now,
      rid: uuid(),
      len: reqHeadContentBuffer.length
    }))

    return this.writeRecordBlock(
      Buffer.concat([reqWHeader, reqHeadContentBuffer, recordSeparatorBuffer]))
  }

  /**
   * @desc Write A Response Record
   * @param {string} targetURI
   * @param {string} httpHeaderString
   * @param {string|Buffer?} responseData
   * @return {Promise<void>}
   */
  writeResponseRecord (targetURI, httpHeaderString, responseData) {
    let resHeaderContentBuffer = Buffer.from(`${CRLF}${httpHeaderString}`,
      'utf8')
    let resDataLen = responseData ? responseData.length : 0
    let respWHeader = Buffer.from(warcResponseHeader({
      targetURI,
      now: this._now,
      rid: this._rid,
      len: resHeaderContentBuffer.length + resDataLen
    }))

    if (responseData !== null && responseData !== undefined) {
      const responseDataBuffer = Buffer.from(responseData)
      return this.writeRecordBlock(Buffer.concat([
        respWHeader,
        resHeaderContentBuffer,
        responseDataBuffer,
        CRLFBuffer,
        recordSeparatorBuffer]))
    } else {
      return this.writeRecordBlock(Buffer.concat([
        respWHeader,
        resHeaderContentBuffer,
        CRLFBuffer,
        recordSeparatorBuffer]))
    }
  }

  /**
   * @desc Write an record block to the WARC
   * @param {Buffer} recordBuffer
   * @return {Promise<void>}
   */
  writeRecordBlock (recordBuffer) {
    return new Promise((resolve, reject) => {
      this._warcOutStream.write(recordBuffer, 'utf8', resolve)
    })
  }

  /**
   * @desc Write arbitrary number of items to the WARC
   * @param {*} recordParts
   * @return {Promise<void>}
   */
  writeRecordChunks (...recordParts) {
    return new Promise((resolve, reject) => {
      let dataIter = recordParts[Symbol.iterator]()
      this._doWrite(dataIter, resolve, reject)
    })
  }

  /**
   * @desc Close  the underlying filestream to the WARC currently being written.
   * The `finished` event will not be emitted until this method has been called
   */
  end () {
    if (this._warcOutStream) {
      this._warcOutStream.end()
    }
  }

  /**
   *
   * @param {Symbol.iterator} dataIter
   * @param resolve
   * @param reject
   * @private
   */
  _doWrite (dataIter, resolve, reject) {
    let next = dataIter.next()
    if (!next.done) {
      this._warcOutStream.write(next.value, 'utf8',
        this._doWrite.bind(this, dataIter, resolve, reject))
    } else {
      resolve()
    }
  }

  /**
   *
   * @param {Symbol.iterator} dataIter
   * @param resolve
   * @param reject
   * @private
   */
  _doWriteChunks (dataIter, resolve, reject) {
    let next = dataIter.next()
    if (!next.done) {
      this._warcOutStream.write(next.value, 'utf8',
        this._doWrite.bind(this, dataIter, resolve, reject))
    } else {
      resolve()
    }
  }

  /**
   * @desc Called when the WARC generation is finished
   * @emits {finished} emitted when WARC generation is complete
   * @private
   */
  _onFinish () {
    let le = this._lastError
    this._lastError = null
    this._warcOutStream.destroy()
    this._warcOutStream = null
    this._rid = null
    this._now = null
    this._fileName = null
    if (le) {
      this.emit('finished', le)
    } else {
      this.emit('finished')
    }
  }

  /**
   * @desc Emits an error if one occurs
   * @emits {error} The error that occurred
   * @private
   */
  _onError (err) {
    this._lastError = err
    this.emit('error', err)
  }
}

module.exports = WARCWriterBase
