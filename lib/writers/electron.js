const WARCWriterBase = require('./warcWriterBase')
const { CRLF } = require('./warcFields')
const { noGZ, replaceContentLen } = require('./constants')
const { getPostData, getResBody } = require('../utils/electron')

/**
 * WARC Generator for use with Electron
 * @see https://electron.atom.io/docs/
 * @see https://electron.atom.io/docs/api/debugger/
 * @extends {WARCWriterBase}
 */
class ElectronWARCGenerator extends WARCWriterBase {
  /**
   * @param {ElectronRequestCapturer} capturer - The Electron request capturer that contains requests
   * to be serialized to the WARC
   * @param {Object} wcDebugger - the Electron debugger to use to get the response body
   * @param {WARCGenOpts} genOpts - Options for generating the WARC and optionally generating
   * WARC info, WARC info + Webrecorder Player bookmark list, metadata records
   * @return {Promise<void>} - A Promise that resolves when WARC generation is complete
   */
  async generateWARC (capturer, wcDebugger, genOpts) {
    const { warcOpts, winfo, metadata } = genOpts
    this.initWARC(warcOpts.warcPath, warcOpts)
    if (winfo != null) {
      await this.writeWarcInfoRecord(winfo)
    }
    if (genOpts.pages) {
      await this.writeWebrecorderBookmarksInfoRecord(genOpts.pages)
    }
    if (metadata != null) {
      await this.writeWarcMetadata(metadata.targetURI, metadata.content)
    }
    for (const request of capturer.iterateRequests()) {
      try {
        await this.generateWarcEntry(request, wcDebugger)
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
   * Generate a WARC record
   * @param {CDPRequestInfo} nreq - The captured HTTP info
   * @param {Object} wcDebugger - The Electron webcontents debugger object
   * @return {Promise<void>}
   */
  async generateWarcEntry (nreq, wcDebugger) {
    if (nreq.url.indexOf('data:') === 0) return
    let postData
    if (nreq.postData) {
      postData = nreq.postData
    } else if (nreq.hasPostData) {
      try {
        const post = await getPostData(nreq.requestId, wcDebugger)
        postData = Buffer.from(post.postData, 'utf8')
      } catch (e) {}
    }
    if (nreq.canSerializeResponse()) {
      let resData
      let responseHeaders = nreq.serializeResponseHeaders()
      if (nreq.getBody) {
        let wasError = false
        try {
          const rbody = await getResBody(nreq.requestId, wcDebugger)
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
        } else {
          // indicate that this record has 0 content
          responseHeaders = responseHeaders.replace(
            replaceContentLen,
            `Content-Length: 0${CRLF}`
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

module.exports = ElectronWARCGenerator
