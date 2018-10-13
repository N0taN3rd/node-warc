const { getResBodyElectron } = require('../utils')
const WARCWriterBase = require('./warcWriterBase')
const { CRLF } = require('./warcFields')
const { noGZ, replaceContentLen } = require('./constants')

/**
 * @desc WARC Generator for use with Electron
 * @see https://electron.atom.io/docs/
 * @see https://electron.atom.io/docs/api/debugger/
 * @extends {WARCWriterBase}
 */
class ElectronWARCGenerator extends WARCWriterBase {
  /**
   * @desc Generate a WARC record
   * @param {RequestInfo} nreq the captured HTTP info
   * @param {Object} wcDebugger the electron webcontents debugger object
   * @return {Promise<void>}
   */
  async generateWarcEntry (nreq, wcDebugger) {
    if (nreq.postData) {
      await this.writeRequestRecord(
        nreq.url,
        nreq.serializeRequestHeaders(),
        nreq.postData
      )
    } else {
      await this.writeRequestRecord(nreq.url, nreq.serializeRequestHeaders())
    }
    if (nreq.canSerializeResponse()) {
      let resData
      let responseHeaders = nreq.serializeResponseHeaders()
      if (nreq.getBody) {
        let wasError = false
        try {
          let rbody = await getResBodyElectron(nreq.requestId, wcDebugger)
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

/**
 * @type {ElectronWARCGenerator}
 */
module.exports = ElectronWARCGenerator
