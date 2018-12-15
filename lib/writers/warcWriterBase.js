const fs = require('fs-extra')
const zlib = require('zlib')
const Path = require('path')
const uuid = require('uuid/v1')
const EventEmitter = require('eventemitter3')
const {
  warcInfoHeader,
  warcInfoContent,
  warcRequestHeader,
  warcResponseHeader,
  warcMetadataHeader,
  recordSeparator,
  CRLF,
  CRLF2x
} = require('./warcFields')
const ensureWARCFileName = require('../utils/ensureWARCFilename')

/**
 * @type {Buffer}
 */
const recordSeparatorBuffer = Buffer.from(recordSeparator, 'utf8')

/**
 * @type {Buffer}
 */
const CRLFBuffer = Buffer.from(CRLF, 'utf8')

/**
 * @type {number}
 */
const WARCSepTSize = recordSeparatorBuffer.length + CRLFBuffer.length

/**
 *
 * @param {string} string
 * @param {?Buffer|?string} maybeBuffer
 * @return {Buffer}
 */
function makeContentBuffer (string, maybeBuffer) {
  if (maybeBuffer != null) {
    // ensure that the string buffer contains CRLF 2x since we have a body
    const strBuff = string.endsWith(CRLF2x)
      ? Buffer.from(string, 'utf8')
      : Buffer.from(`${string}${CRLF}`, 'utf8')
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
 * @param {WARCFileOpts} [opts]
 * @return {WARCFileOpts}
 */
function ensureOptions (opts) {
  if (opts == null) {
    opts = {}
  }
  return {
    appending: opts.appending || false,
    gzip: opts.gzip || process.env.NODEWARC_WRITE_GZIPPED != null
  }
}

/**
 * @extends {EventEmitter}
 * @desc Base class used for writing to the WARC
 */
class WARCWriterBase extends EventEmitter {
  /**
   * @desc Create a new WARCWriter
   * @param {?WARCFileOpts} [defaultOpts] - Optional default WARC file options
   */
  constructor (defaultOpts) {
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
     * @type {?WARCFileOpts}
     */
    this.opts = null

    /**
     * @type {WARCFileOpts}
     */
    this.defaultOpts = ensureOptions(defaultOpts)

    /**
     * @type {string}
     * @private
     */
    this._version = require('../../package.json').version
    this._onFinish = this._onFinish.bind(this)
    this._onError = this._onError.bind(this)
  }

  /**
   * @desc Set the default WARC creation options
   * @param {WARCFileOpts} defaultOpts - The new default options
   */
  setDefaultOpts (defaultOpts) {
    this.defaultOpts = ensureOptions(defaultOpts)
  }

  /**
   * @desc Initialize the writer. The options object is optional and defaults to `appending = false` and `gzip = process.env.NODEWARC_WRITE_GZIPPED != null`.
   * Writing gzipped records is also controllable by setting `NODEWARC_WRITE_GZIPPED` environment variable.
   * Options supplied to this method override the default options.
   * @param {string} warcPath - the path for the WARC file to be written
   * @param {?WARCFileOpts} [options] - write options controlling how the WARC should be written
   */
  initWARC (warcPath, options) {
    this.opts = Object.assign({}, this.defaultOpts, options || {})
    const wfp = ensureWARCFileName(warcPath, this.opts.gzip)
    if (this.opts.appending) {
      this._warcOutStream = fs.createWriteStream(wfp, {
        flags: 'a',
        encoding: 'utf8'
      })
    } else {
      this._warcOutStream = fs.createWriteStream(wfp, { encoding: 'utf8' })
    }
    this._warcOutStream.on('finish', this._onFinish)
    this._warcOutStream.on('error', this._onError)
    let now = new Date().toISOString()
    this._now = now.substr(0, now.indexOf('.')) + 'Z'
    this._fileName = Path.basename(wfp)
  }

  /**
   * @param {string} targetURI - The target URI for the request response record pairs
   * @param {{headers: string, data?: Buffer|string}} reqData - The request data
   * @param {{headers: string, data?: Buffer|string}} resData - The response data
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
   * @desc Write arbitrary number of items to the WARC
   * @param {Buffer[]} recordParts - Array of buffers to be writtern
   * @return {Promise<void>}
   */
  async writeRecordChunks (...recordParts) {
    for (let chunk of recordParts) {
      await this.writeRecordBlock(chunk)
    }
  }

  /**
   * @desc Write out the WARC-Type: info records.
   * If the contents for the info record is an object then the objects properties (property, property value pairs)
   * are written otherwise (when Buffer or string) the content is written as is
   * @param {Object|Buffer|string} winfo - The contents for the WARC info record
   * @return {Promise<void>}
   */
  writeWarcInfoRecord (winfo) {
    if (Buffer.isBuffer(winfo) || typeof winfo === 'string') {
      return this.writeWarcRawInfoRecord(winfo)
    }
    if (winfo.software == null) {
      winfo.software = `node-warc/${this._version}`
    }
    return this.writeWarcRawInfoRecord(
      Buffer.from(warcInfoContent(winfo), 'utf8')
    )
  }

  /**
   * @desc Write warc-info record
   * @param {string|Buffer} warcInfoContent - The contents of the warc-info record
   * @return {Promise<void>}
   */
  writeWarcRawInfoRecord (warcInfoContent) {
    let recID
    if (this._warcInfoId) {
      recID = uuid()
    } else {
      this._warcInfoId = recID = uuid()
    }
    const whct = Buffer.isBuffer(warcInfoContent)
      ? warcInfoContent
      : Buffer.from(warcInfoContent, 'utf8')
    const wh = Buffer.from(
      warcInfoHeader({
        date: this._now,
        fileName: this._fileName,
        len: whct.length,
        rid: recID
      }),
      'utf8'
    )
    const totalLength = wh.length + whct.length + WARCSepTSize
    return this.writeRecordBlock(
      Buffer.concat([wh, CRLFBuffer, whct, recordSeparatorBuffer], totalLength)
    )
  }

  /**
   * @desc Writes a WARC Info record containing Webrecorder/Webrecorder Player bookmark (page list)
   * @param {string|Array<string>} pages - The URL of the page this WARC contains or an Array of URLs for the pages
   * this WARC contains
   * @return {Promise<void>}
   */
  writeWebrecorderBookmarksInfoRecord (pages) {
    let recID
    if (this._warcInfoId) {
      recID = uuid()
    } else {
      this._warcInfoId = recID = uuid()
    }
    const winfoContent = {
      software: `node-warc/${this._version}`,
      'json-metadata': JSON.stringify({
        desc: '',
        auto_title: true,
        type: 'recording',
        pages: Array.isArray(pages)
          ? pages.map(page => ({ timestamp: this._now, url: page }))
          : [{ timestamp: this._now, url: pages }]
      })
    }
    const whct = Buffer.from(warcInfoContent(winfoContent), 'utf8')
    const wh = Buffer.from(
      warcInfoHeader({
        date: this._now,
        fileName: this._fileName,
        len: whct.length,
        rid: recID
      }),
      'utf8'
    )
    const totalLength = wh.length + whct.length + WARCSepTSize
    return this.writeRecordBlock(
      Buffer.concat([wh, CRLFBuffer, whct, recordSeparatorBuffer], totalLength)
    )
  }

  /**
   * @desc Write WARC-Type: metadata for outlinks
   * @param {string} targetURI - The target URI for the metadata record
   * @param {string} outlinks - A string containing outlink metadata
   * @return {Promise<void>}
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
      ? metaData
      : Buffer.from(metaData, 'utf8')
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
    const totalLength = wmhc.length + wmh.length + WARCSepTSize
    return this.writeRecordBlock(
      Buffer.concat([wmh, CRLFBuffer, wmhc, recordSeparatorBuffer], totalLength)
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
   * @desc Close  the underlying filestream to the WARC currently being written.
   * The `finished` event will not be emitted until this method has been called
   */
  end () {
    if (this._warcOutStream != null) {
      this._warcOutStream.end()
    }
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
    const reqHeadContentBuffer = makeContentBuffer(
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
      reqWHeader.length + reqHeadContentBuffer.length + WARCSepTSize
    return this.writeRecordBlock(
      Buffer.concat(
        [reqWHeader, CRLFBuffer, reqHeadContentBuffer, recordSeparatorBuffer],
        totalLength
      )
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
    const resHeaderContentBuffer = makeContentBuffer(
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
      respWHeader.length + resHeaderContentBuffer.length + WARCSepTSize
    return this.writeRecordBlock(
      Buffer.concat(
        [
          respWHeader,
          CRLFBuffer,
          resHeaderContentBuffer,
          recordSeparatorBuffer
        ],
        totalLength
      )
    )
  }

  /**
   * @desc Called when the WARC generation is finished
   * @emits {finished} emitted when WARC generation is complete
   * @private
   */
  _onFinish () {
    let le = this._lastError
    this._lastError = null
    this._warcOutStream.removeAllListeners()
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

/**
 * @typedef {Object} WARCFileOpts
 * @property {boolean} [appending] - Should the WARC writer append to an existing warc?
 * @property {boolean} [gzip] - Should the WARC writer generate gziped records?
 */

/**
 * @typedef {Object} WARCInitOpts
 * @property {string} warcPath - Path the warc file to be written to
 * @property {boolean} [appending] - Should the WARC writer append to an existing warc?
 * @property {boolean} [gzip] - Should the WARC writer generate gziped records?
 */

/**
 * @typedef {Object} Metadata
 * @property {string} targetURI - The target URI for the metadata record
 * @property {?string|Buffer} [content] - The contents of the metadata record
 */

/**
 * @typedef {Object} WARCGenOpts
 * @property {string|Array<string>} pages - The URL of the page this WARC contains or an Array of
 * URLs for the pages this WARC contains. Used to write a WARC Info record containing
 * Webrecorder Player compatible bookmark list
 * @property {WARCInitOpts} warcOpts - Options for the writing of the WARC file
 * @property {Object|Buffer|string} [winfo] - Optional contents for the WARC info record
 * @property {Metadata} [metadata] - Optional metadata contents
 */
