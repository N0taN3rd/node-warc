const { URL } = require('url')
const { STATUS_CODES } = require('http')
const { CRLF } = require('./warcFields')
const WARCWriterBase = require('./warcWriterBase')
const {
  stringifyHeaders,
  stringifyRequestHeaders
} = require('../utils/headerSerializers')
const { httpRequestPath } = require('../utils/url-helpers')
const { noGZ, replaceContentLen } = require('./constants')

/**
 * @extends {WARCWriterBase}
 * @desc WARC Generator for use with puppeteer
 * @see https://github.com/GoogleChrome/puppeteer
 */
class PuppeteerWARCGenerator extends WARCWriterBase {
  /**
   * @desc Create a new PuppeteerWARCGenerator
   */
  constructor () {
    super()
    /**
     * @type {URL}
     * @private
     */
    this._UP = new URL('about:blank')
  }

  /**
   * @desc
   * @param {PuppeteerRequestCapturer} capturer - The Puppeteer request capturer that contains requests
   * to be serialized to the WARC
   * @param {WARCGenOpts} genOpts - Options for generating the WARC and optionally generating
   * WARC info and metadata records
   * @return {Promise<?Error>} - A Promise that resolves when WARC generation is complete
   */
  async generateWARC (capturer, genOpts) {
    const { warcOpts, winfo, metadata } = genOpts
    this.initWARC(warcOpts.warcPath, warcOpts)
    if (winfo != null) {
      await this.writeWarcInfoRecord(
        winfo.isPartOfV,
        winfo.warcInfoDescription,
        winfo.ua
      )
    }
    if (metadata != null) {
      await this.writeWarcMetadata(metadata.targetURI, metadata.content)
    }
    for (let request of capturer.iterateRequests()) {
      try {
        await this.generateWarcEntry(request)
      } catch (error) {
        console.error(error)
      }
    }
    return new Promise(resolve => {
      this.once('finished', resolve)
      this.end()
    })
  }

  /**
   * @desc Generate a WARC record
   * @param {Request} request - A Puppeteer Request object
   * @return {Promise<void>}
   */
  async generateWarcEntry (request) {
    if (request.url().indexOf('data:') === 0) return
    const response = request.response()
    this._UP.href = request.url()
    let reqHTTP = `${request.method()} ${httpRequestPath(
      this._UP
    )} HTTP/1.1${CRLF}${stringifyRequestHeaders(
      request.headers(),
      this._UP.host
    )}`
    if (response) {
      let resHTTP = `HTTP/1.1 ${response.status()} ${
        STATUS_CODES[response.status()]
      } ${CRLF}${stringifyHeaders(response.headers())}`
      let body
      let wasError = false
      try {
        body = await response.buffer()
      } catch (e) {
        wasError = true
      }
      if (!wasError) {
        resHTTP = resHTTP.replace(noGZ, '')
        resHTTP = resHTTP.replace(
          replaceContentLen,
          `Content-Length: ${Buffer.byteLength(body, 'utf8')}${CRLF}`
        )
      } else {
        // indicate that this record has 0 content
        resHTTP = resHTTP.replace(
          replaceContentLen,
          `Content-Length: 0${CRLF}`
        )
      }
      return this.writeRequestResponseRecords(
        this._UP.href,
        { headers: reqHTTP, data: request.postData() },
        { headers: resHTTP, data: body }
      )
    }
    return this.writeRequestRecord(this._UP.href, reqHTTP, request.postData())
  }
}

/**
 * @type {PuppeteerWARCGenerator}
 */
module.exports = PuppeteerWARCGenerator
