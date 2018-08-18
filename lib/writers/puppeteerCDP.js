const WARCWriterBase = require('./warcWriterBase')
const { CRLF } = require('./warcFields')

/** @ignore */
const noGZ = /Content-Encoding.*(?:gzip|br|deflate)\r\n/gi
/** @ignore */
const replaceContentLen = /Content-Length:.*\r\n/gi

/**
 * @desc WARC Generator for use with puppeteer
 * @see https://github.com/GoogleChrome/puppeteer
 * @extends WARCWriterBase
 */
class PuppeteerCDPWARCGenerator extends WARCWriterBase {
  /**
   * @desc Generate a WARC record
   * @param {RequestInfo}  nreq
   * @param {CDPSession} client
   * @return {Promise<void>}
   */
  async generateWarcEntry (nreq, client) {
    if (nreq.postData) {
      await this.writeRequestRecord(
        nreq.url,
        nreq.serializeRequestHeaders(),
        nreq.postData
      )
    } else if (nreq.hasPostData) {
      let postData
      try {
        let post = await client.send('Network.getRequestPostData', {
          requestId: nreq.requestId
        })
        postData = Buffer.from(post.postData, 'base64').toString()
      } catch (e) {}
      await this.writeRequestRecord(nreq.url, nreq.serializeRequestHeaders(), postData)
    } else {
      await this.writeRequestRecord(nreq.url, nreq.serializeRequestHeaders())
    }
    if (nreq.canSerializeResponse()) {
      let resData
      let responseHeaders = nreq.serializeResponseHeaders()
      if (nreq.getBody) {
        let wasError = false
        try {
          let rbody = await client.send('Network.getResponseBody', {
            requestId: nreq.requestId
          })
          if (rbody.base64Encoded) {
            resData = Buffer.from(rbody.body, 'base64')
          } else {
            resData = Buffer.from(rbody.body, 'utf8')
          }
        } catch (err) {
          wasError = true
        }
        if (!wasError) {
          responseHeaders = responseHeaders.replace(noGZ, '')
          responseHeaders = responseHeaders.replace(
            replaceContentLen,
            `Content-Length: ${Buffer.byteLength(resData, 'utf8')}${CRLF}`
          )
        }
      }
      await this.writeResponseRecord(nreq.url, responseHeaders, resData)
    }
  }
}

module.exports = PuppeteerCDPWARCGenerator
