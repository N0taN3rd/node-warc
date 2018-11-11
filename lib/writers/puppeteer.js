const { URL } = require('url')
const { STATUS_CODES } = require('http')
const { CRLF } = require('./warcFields')
const WARCWriterBase = require('./warcWriterBase')
const {
  stringifyHeaders,
  stringifyRequestHeaders
} = require('../utils/headerSerializers')
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
   * @desc Generate a WARC record
   * @param {Request}  request
   * @return {Promise<void>}
   */
  async generateWarcEntry (request) {
    if (request.url().indexOf('data:') === 0) return
    const response = request.response()
    this._UP.href = request.url()
    let reqHTTP = `${request.method()} ${this._UP.pathname +
      this._UP.searchParams.toString() +
      this._UP.hash} HTTP/1.1${CRLF}${stringifyRequestHeaders(request.headers(), this._UP.host)}`
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
