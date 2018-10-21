const WARCWriterBase = require('./warcWriterBase')
const { STATUS_CODES } = require('http')
const { URL } = require('url')
const { CRLF } = require('./warcFields')
const {
  stringifyHeaders,
  stringifyRequestHeaders
} = require('../utils/headerSerializers')

/** @ignore */
const noGZ = /Content-Encoding.*(?:gzip|br|deflate)\r\n/gi
/** @ignore */
const replaceContentLen = /Content-Length:.*\r\n/gi

/**
 * @desc WARC Generator for use with request
 * @see https://github.com/request/request-promise
 * @extends WARCWriterBase
 */
class RequestLibWARCGenerator extends WARCWriterBase {
  constructor () {
    super()
    this._UP = new URL('about:blank')
  }

  /**
   * Generates a WARC record. Needs the following request lib defaults:
   * rp.defaults({
   *   resolveWithFullResponse: true,
   *   simple: false
   * })
   * @param {Request} resp
   * @returns {Promise<void>}
   */
  async generateWarcEntry (resp) {
    // generate the HTTP request to put in the WARC headers
    let reqHTTP = ''
    this._UP.href = resp.request.href;
    if (this._UP.search !== '') {
      reqHTTP += `${resp.request.method} ${this._UP.pathname}${this._UP.search[0]}${this._UP.searchParams} HTTP/1.1${CRLF}`
    } else {
      reqHTTP += `${resp.request.method} ${this._UP.pathname} HTTP/1.1${CRLF}`
    }
    reqHTTP += stringifyRequestHeaders(resp.request.headers, this._UP.host);

    // if we made a POST request, make sure we have the content
    const pd = resp.request.method === 'POST' ? resp.request.body : null

    // now, write our request record
    await this.writeRequestRecord(this._UP.href, reqHTTP, pd)

    // write the response - we won't have a resp if we've only made a request
    let resHTTP = `HTTP/1.1 ${resp.statusCode} ${
      STATUS_CODES[resp.statusCode]
    } ${CRLF}${stringifyHeaders(resp.headers)}`
    let body = resp.body

    if (body) {
      resHTTP = resHTTP.replace(noGZ, '')
      resHTTP = resHTTP.replace(
        replaceContentLen,
        `Content-Length: ${Buffer.byteLength(body, 'utf8')}${CRLF}`
      )
    } else {
      // TODO: port into Puppeteer too!
      // indicate that this record has 0 content
      resHTTP = resHTTP.replace(
        replaceContentLen,
        `Content-Length: 0${CRLF}`
      )
    }
    await this.writeResponseRecord(this._UP.href, resHTTP, body)
  }
}

module.exports = RequestLibWARCGenerator
