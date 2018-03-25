const zlib = require('zlib')
const Promise = require('bluebird')
const brotli = require('iltorb')

/**
 * Promise Wrapper Around Zlib And Iltorb Compression Libraries
 */
class ResponseEncoder {
  /**
   * @desc Encode The Response Body Using Gzip
   * @param {Buffer} buffer The Raw Response Body
   * @return {Promise<Buffer>} The Compressed Buffer
   */
  static gzip (buffer) {
    return new Promise((resolve, reject) => {
      zlib.gzip(buffer, (err, compressed) => {
        if (err) {
          reject(err)
        } else {
          resolve(compressed)
        }
      })
    })
  }

  /**
   * @desc Encode The Response Body Using Deflate
   * @param {Buffer} buffer The Raw Response Body
   * @return {Promise<Buffer>} The Compressed Buffer
   */
  static deflate (buffer) {
    return new Promise((resolve, reject) => {
      zlib.deflate(buffer, (err, compressed) => {
        if (err) {
          reject(err)
        } else {
          resolve(compressed)
        }
      })
    })
  }

  /**
   * @desc Encode The Response Body Using Brotli
   * @param {Buffer} buffer The Raw Response Body
   * @return {Promise<Buffer>} The Compressed Buffer
   */
  static br (buffer) {
    return new Promise((resolve, reject) => {
      brotli.compress(buffer, (err, compressed) => {
        if (err) {
          reject(err)
        } else {
          resolve(compressed)
        }
      })
    })
  }

  /**
   * @desc Compress A Raw Buffer Using Encoding
   * @param {Buffer} buffer The Buffer To Compress
   * @param {string} encoding The Encoding Of The Response Body
   * @return {Promise<Buffer>}
   */
  static compress (buffer, encoding) {
    if (encoding === 'gzip') {
      return ResponseEncoder.gzip(buffer)
    } else if (encoding === 'deflate') {
      return ResponseEncoder.deflate(buffer)
    } else if (encoding === 'br') {
      return ResponseEncoder.br(buffer)
    }
    return Promise.resolve(buffer)
  }

  /**
   * @desc Can We Compress Using Encoding
   * @param {string} encoding The Encoding Of The Response Body
   * @return {boolean}
   */
  static canCompress (encoding) {
    if (encoding === 'gzip') {
      return true
    } else if (encoding === 'deflate') {
      return true
    } else if (encoding === 'br') {
      return true
    }
    return false
  }
}

module.exports = ResponseEncoder
