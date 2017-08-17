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
      zlib.gzip(buffer, (err, encoded) => {
        if (err) {
          reject(err)
        } else {
          resolve({buffer: encoded, len: Buffer.byteLength(encoded, 'binary')})
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
      zlib.deflate(buffer, (err, encoded) => {
        if (err) {
          reject(err)
        } else {
          resolve({buffer: encoded, len: Buffer.byteLength(encoded, 'binary')})
        }
      })
    })
  }

  static compress (buffer, using) {
    if (using === 'gzip') {
      return ResponseEncoder.gzip(buffer)
    } else {
      return ResponseEncoder.deflate(buffer)
    }
  }

  static canCompress (using) {
    if (using === 'gzip') {
      return true
    } else if (using === 'deflate') {
      return true
    }

    return false
  }
}

module.exports = ResponseEncoder
