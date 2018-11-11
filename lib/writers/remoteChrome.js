const WARCWriterBase = require('./warcWriterBase')
const { CRLF } = require('./warcFields')
const { noGZ, replaceContentLen } = require('./constants')

/**
 * @desc WARC Generator for use with chrome-remote-interface
 * @see https://github.com/cyrus-and/chrome-remote-interface
 * @extends {WARCWriterBase}
 */
class RemoteChromeWARCGenerator extends WARCWriterBase {
  /**
   * @desc Generate a WARC record
   * @param {CDPRequestInfo} nreq
   * @param {Object} network
   * @return {Promise<void>}
   */
  async generateWarcEntry (nreq, network) {
    if (nreq.url.indexOf('data:') === 0) return
    let postData
    if (nreq.postData) {
      postData = nreq.postData
    } else if (nreq.hasPostData) {
      try {
        let post = await network.getRequestPostData({
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
          let rbody = await network.getResponseBody({
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
 * @type {RemoteChromeWARCGenerator}
 */
module.exports = RemoteChromeWARCGenerator
