const zlib = require('zlib')
const Promise = require('bluebird')

/**
 * Renencode The Raw Response As Gotten From {@link https://chromedevtools.github.io/devtools-protocol/tot/Network}
 */
class ResponseEncoder {

  /**
   * @desc Encode The Response Body Using Gzip
   * @param {Buffer} buffer The Raw Response Body
   */
  static gzip (buffer) {
    return new Promise((resolve, reject) => {
      zlib.gzip(buffer, (err, gzBuffer) => {
        if (err) {
          reject(err)
        } else {
          resolve(gzBuffer)
        }
      })
    })
  }

  /**
   * @desc Encode The Response Body Using Deflate
   * @param {Buffer} buffer The Raw Response Body
   */
  static deflate (buffer) {
    return new Promise((resolve, reject) => {
      zlib.deflate(buffer, (err, deflateBuffer) => {
        if (err) {
          reject(err)
        } else {
          resolve(deflateBuffer)
        }
      })
    })
  }
}

module.exports = ResponseEncoder
