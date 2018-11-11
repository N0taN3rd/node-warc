const fs = require('fs-extra')
const zlib = require('zlib')
const Path = require('path')
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

/**
 * @type {Buffer}
 */
const recordSeparatorBuffer = Buffer.from(recordSeparator, 'utf8')

/**
 * @type {Buffer}
 */
const CRLFBuffer = Buffer.from(CRLF, 'utf8')

/**
 * @param {string} str
 * @return {boolean}
 */
function stringEndsWithCRLF (str) {
  return str[str.length - 1] === CRLF[1] && str[str.length - 2] === CRLF[0]
}

/**
 *
 * @param {string} string
 * @param {?Buffer|?string} maybeBuffer
 * @return {Buffer}
 */
function makeContentBuffer (string, maybeBuffer) {
  const strBuffer = Buffer.from(
    `${CRLF}${
      string[string.length - 1] === CRLF[1] &&
      string[string.length - 2] === CRLF[0]
        ? string
        : string + CRLF
    }`,
    'utf8'
  )
  if (maybeBuffer != null) {
    const breqData = Buffer.isBuffer(maybeBuffer)
      ? maybeBuffer
      : Buffer.from(maybeBuffer, 'utf8')
    return Buffer.concat(
      [strBuffer, breqData],
      strBuffer.length + breqData.length
    )
  }
  return strBuffer
}

/**
 *
 * @param {string} string
 * @param {?Buffer|?string} maybeBuffer
 * @return {Buffer}
 */
function makeContentBuffer2 (string, maybeBuffer) {
  if (maybeBuffer != null) {
    const strBuff = stringEndsWithCRLF(string)
      ? Buffer.from(`${CRLF}${string}`, 'utf8')
      : Buffer.from(`${CRLF}${string}${CRLF}`, 'utf8')
    const cntBuffer = Buffer.isBuffer(maybeBuffer)
      ? maybeBuffer
      : Buffer.from(maybeBuffer, 'utf8')
    return Buffer.concat(
      [strBuff, cntBuffer],
      strBuff.length + cntBuffer.length
    )
  }
  return Buffer.from(string, 'utf8')
}

/**
 * @desc Default options that control how WARC writting is done
 * @type {{appending: boolean, gzip: boolean}}
 */
const defaultOpts = {
  appending: false,
  gzip: process.env.NODEWARC_WRITE_GZIPPED != null
}

/**
 * @extends {EventEmitter}
 * @desc Base class used for writing to the WARC
 */
class WARCWriterBase extends EventEmitter {
  /**
   * @desc Create a new WARCWriter
   */
  constructor () {
    super()
    /**
     * @type {?WriteStream}
     * @private
     */
    this._warcOutStream = null
    /**
     * @type {?Error}
     * @private
     */
    this._lastError = null
    /**
     * @type {?string}
     * @private
     */
    this._now = null
    /**
     * @type {?string}
     * @private
     */
    this._fileName = null
    /**
     * @type {?string}
     * @private
     */
    this._warcInfoId = null

    /**
     * @type {{appending: boolean, gzip: boolean}}
     */
    this.opts = defaultOpts

    /**
     * @type {string}
     * @private
     */
    this._version = '3.0.0'
    this._onFinish = this._onFinish.bind(this)
    this._onError = this._onError.bind(this)
  }

  /**
   * @desc Initialize the writer. The options object is optional and defaults to `appending = false` and `gzip = process.env.NODEWARC_WRITE_GZIPPED != null`.
   * Writing gzipped records is also controllable by setting `NODEWARC_WRITE_GZIPPED` environment variable.
   * Options supplied to this method override the default options.
   * @param {string} warcPath - the path for the WARC file to be written
   * @param {{appending: boolean, gzip: boolean}} [options] - write options controlling how the WARC should be written
   */
  initWARC (warcPath, options) {
    this.opts = Object.assign({}, defaultOpts, options || {})
    if (this.opts.appending) {
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
    this._fileName = Path.basename(warcPath)
    this._warcInfoId = uuid()
  }

  /**
   * @desc Write out the WARC-Type: info records
   * @param {string} isPartOfV - The value of isPartOf
   * @param {string} warcInfoDescription
   * @param {string} ua - user agent
   * @return {Promise<void>}
   */
  writeWarcInfoRecord (isPartOfV, warcInfoDescription, ua) {
    const whct = Buffer.from(
      warcHeaderContent({
        version: this._version,
        isPartOfV,
        warcInfoDescription,
        ua
      }),
      'utf8'
    )
    const whc = Buffer.from(`${CRLF}${whct}`, 'utf8')
    const wh = Buffer.from(
      warcHeader({
        now: this._now,
        fileName: this._fileName,
        len: whc.length,
        rid: this._warcInfoId
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
   * @return {Promise.<void>}
   */
  writeWarcMetadataOutlinks (targetURI, outlinks) {
    return this.writeWarcMetadata(targetURI, outlinks)
  }

  /**
   * @desc Write WARC-Type: metadata record
   * @param {string} targetURI - The URL of the page the this metadata record is for
   * @param {string|Buffer} metaData - A string or buffer containing metadata information to be used as this records content
   * @return {Promise<void>}
   */
  writeWarcMetadata (targetURI, metaData) {
    const wmhc = Buffer.isBuffer(metaData)
      ? Buffer.concat(
        [CRLFBuffer, metaData],
        CRLFBuffer.length + metaData.length
      )
      : Buffer.from(`${CRLF}${metaData}`, 'utf8')
    const wmh = Buffer.from(
      warcMetadataHeader({
        targetURI,
        now: this._now,
        len: wmhc.length,
        concurrentTo: this._warcInfoId,
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
   * @param {string} targetURI
   * @param {{headers: string, data?: Buffer|string}} reqData
   * @param {{headers: string, data?: Buffer|string}} resData
   * @return {Promise<void>}
   */
  async writeRequestResponseRecords (targetURI, reqData, resData) {
    const resRecId = uuid()
    await this._writeRequestRecord(
      targetURI,
      resRecId,
      reqData.headers,
      reqData.data
    )
    return this._writeResponseRecord(
      targetURI,
      resRecId,
      resData.headers,
      resData.data
    )
  }

  /**
   * @desc Write A Request Record
   * @param {string} targetURI - The URL of the response
   * @param {?string} resId - The id of the record this request recorrd is concurrent to, typically its response
   * @param {string} httpHeaderString - Stringified HTTP headers
   * @param {string|Buffer} [requestData] - Body of the request if any
   * @return {Promise<void>}
   */
  _writeRequestRecord (targetURI, resId, httpHeaderString, requestData) {
    const reqHeadContentBuffer = makeContentBuffer2(
      httpHeaderString,
      requestData
    )
    const reqWHeader = Buffer.from(
      warcRequestHeader({
        targetURI,
        concurrentTo: resId,
        now: this._now,
        rid: uuid(),
        wid: this._warcInfoId,
        len: reqHeadContentBuffer.length
      }),
      'utf8'
    )
    const totalLength =
      reqWHeader.length +
      reqHeadContentBuffer.length +
      recordSeparatorBuffer.length
    return this.writeRecordBlock(
      Buffer.concat(
        [reqWHeader, reqHeadContentBuffer, recordSeparatorBuffer],
        totalLength
      )
    )
  }

  /**
   * @desc Write A Request Record
   * @param {string} targetURI - The URL of the response
   * @param {string} httpHeaderString - Stringified HTTP headers
   * @param {string|Buffer} [requestData] - Body of the request if any
   * @return {Promise<void>}
   */
  writeRequestRecord (targetURI, httpHeaderString, requestData) {
    return this._writeRequestRecord(
      targetURI,
      null,
      httpHeaderString,
      requestData
    )
  }

  /**
   * @desc Write A Response Record
   * @param {string} targetURI - The URL of the response
   * @param {string} resId - The id to be used for the response record
   * @param {string} httpHeaderString - Stringified HTTP headers
   * @param {string|Buffer} [responseData] - The response body if it exists
   * @return {Promise<void>}
   */
  _writeResponseRecord (targetURI, resId, httpHeaderString, responseData) {
    const resHeaderContentBuffer = makeContentBuffer2(
      httpHeaderString,
      responseData
    )
    const respWHeader = Buffer.from(
      warcResponseHeader({
        targetURI,
        now: this._now,
        rid: resId,
        wid: this._warcInfoId,
        len: resHeaderContentBuffer.length
      }),
      'utf8'
    )
    const totalLength =
      respWHeader.length +
      resHeaderContentBuffer.length +
      recordSeparatorBuffer.length
    return this.writeRecordBlock(
      Buffer.concat(
        [respWHeader, resHeaderContentBuffer, recordSeparatorBuffer],
        totalLength
      )
    )
  }

  /**
   * @desc Write A Response Record
   * @param {string} targetURI - The URL of the response
   * @param {string} httpHeaderString - Stringified HTTP headers
   * @param {string|Buffer} [responseData] - The response body if it exists
   * @return {Promise<void>}
   */
  writeResponseRecord (targetURI, httpHeaderString, responseData) {
    return this._writeResponseRecord(
      targetURI,
      uuid(),
      httpHeaderString,
      responseData
    )
  }

  /**
   * @desc Write an record block to the WARC
   * @param {Buffer} recordBuffer
   * @return {Promise<void>}
   */
  writeRecordBlock (recordBuffer) {
    return new Promise((resolve, reject) => {
      if (this.opts.gzip) {
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
   * @param {Buffer[]} recordParts
   * @return {Promise<void>}
   */
  async writeRecordChunks (...recordParts) {
    for (let chunk of recordParts) {
      await this.writeRecordBlock(chunk)
    }
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
   * @desc Called when the WARC generation is finished
   * @emits {finished} emitted when WARC generation is complete
   * @private
   */
  _onFinish () {
    let le = this._lastError
    this._lastError = null
    this._warcOutStream.destroy()
    this._warcOutStream = null
    this._now = null
    this._fileName = null
    this._warcInfoId = null
    if (le) {
      this.emit('finished', le)
    } else {
      this.emit('finished')
    }
  }

  /**
   * @desc Emits an error if one occurs
   * @param {Error} err
   * @emits {error} The error that occurred
   * @private
   */
  _onError (err) {
    this._lastError = err
    this.emit('error', err)
  }
}

/**
 * @type {WARCWriterBase}
 */
module.exports = WARCWriterBase
