/** @ignore */
const fs = require('fs-extra')
/** @ignore */
const zlib = require('zlib');
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
 * @desc The base class of {@link ElectronWARCGenerator}, {@link RemoteChromeWARCGenerator} and {@link PuppeteerWARCGenerator}
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
    this._version = '2.1.0'
    this._onFinish = this._onFinish.bind(this)
    this._onError = this._onError.bind(this)
  }

  /**
   * @desc Initialize the writer
   * @param {string} warcPath - the path for the WARC file to be written
   * @param {boolean} [appending] appending - append to a previously created WARC file
   */
  initWARC (warcPath, appending) {
    if (appending) {
      this._warcOutStream = fs.createWriteStream(warcPath, {
        flags: 'a',
        encoding: 'utf8'
      })
    } else {
      this._warcOutStream = fs.createWriteStream(warcPath, { encoding: 'utf8' })
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
    let whct = Buffer.from(
      warcHeaderContent({
        version: this._version,
        isPartOfV,
        warcInfoDescription,
        ua
      }),
      'utf8'
    )
    let whc = Buffer.from(`${CRLF}${whct}${CRLF}`, 'utf8')
    let wh = Buffer.from(
      warcHeader({
        now: this._now,
        fileName: this._fileName,
        len: whc.length,
        rid: this._wid
      }),
      'utf8'
    )
    const totalLength = wh.length + whc.length + recordSeparatorBuffer.length
    return this.writeRecordBlock(
      Buffer.concat([wh, whc, recordSeparatorBuffer], totalLength)
    )
  }

  /**
   * @desc Write WARC-Type: metadata for outlinks
   * @param {string} targetURI
   * @param {string} outlinks
   * @return {Promise<void>}
   */
  writeWarcMetadataOutlinks (targetURI, outlinks) {
    let wmhc = Buffer.from(`${CRLF}${outlinks}${CRLF}`, 'utf8')
    let wmh = Buffer.from(
      warcMetadataHeader({
        targetURI,
        now: this._now,
        len: wmhc.length,
        concurrentTo: this._rid,
        rid: uuid()
      }),
      'utf8'
    )
    const totalLength = wmhc.length + wmh.length + recordSeparatorBuffer.length
    return this.writeRecordBlock(
      Buffer.concat([wmh, wmhc, recordSeparatorBuffer], totalLength)
    )
  }

  /**
   * @desc Write A Request Record
   * @param {string} targetURI
   * @param {string} httpHeaderString
   * @param {string|Buffer} [requestData]
   * @return {Promise<void>}
   */
  writeRequestRecord (targetURI, httpHeaderString, requestData) {
    let https = `${CRLF}${httpHeaderString}`
    if (requestData != null) {
      https += `${requestData}${CRLF}`
    }
    let reqHeadContentBuffer = Buffer.from(https, 'utf8')
    let reqWHeader = Buffer.from(
      warcRequestHeader({
        targetURI,
        concurrentTo: this._rid,
        now: this._now,
        rid: uuid(),
        len: reqHeadContentBuffer.length
      }),
      'utf8'
    )
    const totalLength =
      reqWHeader.length + recordSeparatorBuffer.length + reqHeadContentBuffer.length
    return this.writeRecordBlock(
      Buffer.concat(
        [reqWHeader, reqHeadContentBuffer, recordSeparatorBuffer],
        totalLength
      )
    )
  }

  /**
   * @desc Write A Response Record
   * @param {string} targetURI
   * @param {string} httpHeaderString
   * @param {string|Buffer} [responseData]
   * @return {Promise<void>}
   */
  writeResponseRecord (targetURI, httpHeaderString, responseData) {
    let resHeaderContentBuffer = Buffer.from(`${CRLF}${httpHeaderString}`, 'utf8')
    let resDataLen = responseData ? responseData.length : 0
    let respWHeader = Buffer.from(
      warcResponseHeader({
        targetURI,
        now: this._now,
        rid: this._rid,
        len: resHeaderContentBuffer.length + resDataLen
      }),
      'utf8'
    )
    const totalLength =
      respWHeader.length +
      resHeaderContentBuffer.length +
      CRLFBuffer.length +
      recordSeparatorBuffer.length
    if (responseData !== null && responseData !== undefined) {
      let responseDataBuffer
      if (responseData instanceof Buffer) {
        responseDataBuffer = responseData
      } else {
        responseDataBuffer = Buffer.from(responseData, 'utf8')
      }
      return this.writeRecordBlock(
        Buffer.concat(
          [
            respWHeader,
            resHeaderContentBuffer,
            responseDataBuffer,
            CRLFBuffer,
            recordSeparatorBuffer
          ],
          totalLength + responseDataBuffer.length
        )
      )
    } else {
      return this.writeRecordBlock(
        Buffer.concat(
          [respWHeader, resHeaderContentBuffer, CRLFBuffer, recordSeparatorBuffer],
          totalLength
        )
      )
    }
  }

  /**
   * @desc Write an record block to the WARC
   * @param {Buffer} recordBuffer
   * @return {Promise<void>}
   */
  writeRecordBlock (recordBuffer) {
    return new Promise((resolve, reject) => {
      if (process.env.NODEWARC_WRITE_GZIPPED) {
        // we're in gzipped mode - GZip the buffer
        recordBuffer = zlib.gzipSync(recordBuffer)
      }

      if (!this._warcOutStream.write(recordBuffer, 'utf8')) {
        this._warcOutStream.once('drain', resolve)
      } else {
        resolve()
      }
    })
  }

  /**
   * @desc Write arbitrary number of items to the WARC
   * @param {*} recordParts
   * @return {Promise<void>}
   */
  writeRecordChunks (...recordParts) {
    return new Promise((resolve, reject) => {
      const dataIter = recordParts[Symbol.iterator]()
      const writer = () => {
        let next = dataIter.next()
        if (!next.done) {
          if (!this._warcOutStream.write(next.value, 'utf8')) {
            this._warcOutStream.once('drain', writer)
          } else {
            process.nextTick(writer)
          }
        } else {
          resolve()
        }
      }
      writer()
      // this._doWrite(dataIter, resolve, reject)
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
      if (!this._warcOutStream.write(next.value, 'utf8')) {
        this._warcOutStream.once(
          'drain',
          this._doWrite.bind(this, dataIter, resolve, reject)
        )
      } else {
        process.nextTick(this._doWrite.bind(this, dataIter, resolve, reject))
      }
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
      this._warcOutStream.write(
        next.value,
        'utf8',
        this._doWrite.bind(this, dataIter, resolve, reject)
      )
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
