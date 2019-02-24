const { CRLF } = require('./warcFields')
const WARCWriterBase = require('./warcWriterBase')
const { noGZ, replaceContentLen } = require('./constants')

/**
 * @extends {WARCWriterBase}
 * @desc WARC Generator for use with puppeteer
 * @see https://github.com/N0taN3rd/chrome-remote-interface-extra
 */
class CRIExtraWARCGenerator extends WARCWriterBase {
  /**
   * @param {CRIExtraRequestCapturer} capturer - The Puppeteer request capturer that contains requests
   * to be serialized to the WARC
   * @param {WARCGenOpts} genOpts - Options for generating the WARC and optionally generating
   * WARC info, WARC info + Webrecorder Player bookmark list, metadata records
   * @return {Promise<?Error>} - A Promise that resolves when WARC generation is complete
   */
  async generateWARC (capturer, genOpts) {
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
    for (let request of capturer.iterateRequests()) {
      try {
        await this.generateWarcEntry(request)
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
   * @desc Generate a WARC record
   * @param {Request} request - A chrome-remote-interface-extra Request object
   * @return {Promise<void>}
   */
  async generateWarcEntry (request) {
    const url = request.url()
    if (url.startsWith('data:')) return
    const response = request.response()
    let postData
    if (request.postData()) {
      postData = request.postData()
    } else if (request.hasPostData()) {
      try {
        postData = await request.getPostData()
      } catch (e) {}
    }
    const reqHTTP = request.requestLineAndHeaders(true)
    if (response) {
      let resHTTP = response.statusLineAndHeaders(true)
      let body
      let wasError = false
      try {
        body = await response.buffer()
      } catch (e) {
        wasError = true
      }
      if (!wasError) {
        resHTTP = resHTTP
          .replace(noGZ, '')
          .replace(
            replaceContentLen,
            `Content-Length: ${Buffer.byteLength(body, 'utf8')}${CRLF}`
          )
      } else {
        // indicate that this record has 0 content
        resHTTP = resHTTP.replace(replaceContentLen, `Content-Length: 0${CRLF}`)
      }
      return this.writeRequestResponseRecords(
        url,
        { headers: reqHTTP, data: postData },
        { headers: resHTTP, data: body }
      )
    }
    return this.writeRequestRecord(url, reqHTTP, postData)
  }
}

/**
 * @type {CRIExtraWARCGenerator}
 */
module.exports = CRIExtraWARCGenerator
