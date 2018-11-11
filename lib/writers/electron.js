const WARCWriterBase = require('./warcWriterBase')
const { CRLF } = require('./warcFields')
const { noGZ, replaceContentLen } = require('./constants')
const { getPostData, getResBody } = require('../utils/electron')

/**
 * @desc WARC Generator for use with Electron
 * @see https://electron.atom.io/docs/
 * @see https://electron.atom.io/docs/api/debugger/
 * @extends {WARCWriterBase}
 */
class ElectronWARCGenerator extends WARCWriterBase {
  /**
   * @desc Generate a WARC record
   * @param {CDPRequestInfo} nreq the captured HTTP info
   * @param {Object} wcDebugger the electron webcontents debugger object
   * @return {Promise<void>}
   */
  async generateWarcEntry (nreq, wcDebugger) {
    if (nreq.url.indexOf('data:') === 0) return
    let postData
    if (nreq.postData) {
      postData = nreq.postData
    } else if (nreq.hasPostData) {
      try {
        let post = await getPostData(nreq.requestId, wcDebugger)
        postData = Buffer.from(post.postData, 'base64')
      } catch (e) {}
    }
    if (nreq.canSerializeResponse()) {
      let resData
      let responseHeaders = nreq.serializeResponseHeaders()
      if (nreq.getBody) {
        let wasError = false
        try {
          let rbody = await getResBody(nreq.requestId, wcDebugger)
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
 * @type {ElectronWARCGenerator}
 */
module.exports = ElectronWARCGenerator
