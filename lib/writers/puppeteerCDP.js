const WARCWriterBase = require('./warcWriterBase')
const { CRLF } = require('./warcFields')
const { noGZ, replaceContentLen } = require('./constants')

/**
 * @desc WARC Generator for use with puppeteer
 * @see https://github.com/GoogleChrome/puppeteer
 * @extends {WARCWriterBase}
 */
class PuppeteerCDPWARCGenerator extends WARCWriterBase {
  /**
   * @desc Generate a WARC record
   * @param {CDPRequestInfo} nreq
   * @param {CDPSession} client
   * @return {Promise<void>}
   */
  async generateWarcEntry (nreq, client) {
    if (nreq.url.indexOf('data:') === 0) return
    let postData
    if (nreq.postData) {
      postData = nreq.postData
    } else if (nreq.hasPostData) {
      try {
        let post = await client.send('Network.getRequestPostData', {
          requestId: nreq.requestId
        })
        postData = Buffer.from(post.postData, 'base64')
      } catch (e) {}
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
      return this.writeRequestResponseRecords(
        nreq.url,
        {
          headers: nreq.serializeRequestHeaders(),
          data: postData
        },
        {
          headers: responseHeaders,
          data: resData
        }
      )
    }
    return this.writeRequestRecord(
      nreq.url,
      nreq.serializeRequestHeaders(),
      postData
    )
  }
}

/**
 * @type {PuppeteerCDPWARCGenerator}
 */
module.exports = PuppeteerCDPWARCGenerator
