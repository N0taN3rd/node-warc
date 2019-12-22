const WARCWriterBase = require('./warcWriterBase')
const { CRLF } = require('./warcFields')
const { noGZ, replaceContentLen } = require('./constants')

/**
 * WARC Generator for use with chrome-remote-interface
 * @see https://github.com/cyrus-and/chrome-remote-interface
 * @extends {WARCWriterBase}
 */
class RemoteChromeWARCGenerator extends WARCWriterBase {
  /**
   * @param {RemoteChromeRequestCapturer} capturer - The RemoteChrome request capturer that contains requests
   * to be serialized to the WARC
   * @param {Object} network - The chrome-remote-interface Network object
   * @param {WARCGenOpts} genOpts - Options for generating the WARC and optionally generating
   * WARC info, WARC info + Webrecorder Player bookmark list, metadata records
   * @return {Promise<void>} - A Promise that resolves when WARC generation is complete
   */
  async generateWARC (capturer, network, genOpts) {
    const { warcOpts, winfo, metadata } = genOpts
    this.initWARC(warcOpts.warcPath, warcOpts)
    /* istanbul ignore if */
    if (winfo != null) {
      await this.writeWarcInfoRecord(winfo)
    }
    if (genOpts.pages) {
      await this.writeWebrecorderBookmarksInfoRecord(genOpts.pages)
    }
    /* istanbul ignore if */
    if (metadata != null) {
      await this.writeWarcMetadata(metadata.targetURI, metadata.content)
    }
    for (const request of capturer.iterateRequests()) {
      try {
        await this.generateWarcEntry(request, network)
      } catch (error) {
        /* istanbul ignore next */
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
   * @param {Object} network - The chrome-remote-interface Network object
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
        postData = Buffer.from(post.postData, 'utf8')
      } catch (e) {}
    }
    if (nreq.canSerializeResponse()) {
      let resData
      let responseHeaders = nreq.serializeResponseHeaders()
      if (nreq.getBody) {
        let wasError = false
        try {
          const rbody = await network.getResponseBody({
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

module.exports = RemoteChromeWARCGenerator
