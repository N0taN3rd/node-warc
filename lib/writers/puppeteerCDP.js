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
   * @param {PuppeteerCDPRequestCapturer} capturer  - The PuppeteerCDP request capturer that contains requests
   * to be serialized to the WARC
   * @param {CDPSession} client - A CDPSession connected to the target the response bodies will be retrieved from
   * @param {WARCGenOpts} genOpts - Options for generating the WARC and optionally generating
   * WARC info and metadata records
   * @return {Promise<?Error>} - A Promise that resolves when WARC generation is complete
   */
  async generateWARC (capturer, client, genOpts) {
    const { winfo, metadata, warcOpts } = genOpts
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
        await this.generateWarcEntry(request, client)
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
   * @param {CDPRequestInfo} nreq - The captured HTTP info
   * @param {CDPSession} client - A CDPSession connected to the target the response bodies will be retrieved from
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

/**
 * @type {PuppeteerCDPWARCGenerator}
 */
module.exports = PuppeteerCDPWARCGenerator
