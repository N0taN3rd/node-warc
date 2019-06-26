//import { fs, untildify } from '../utils/getStream'
const gs = require('../utils/getStream');
const fs = gs.fs;
const untildify = gs.untildify;

/**
 * @see https://en.wikipedia.org/wiki/Gzip
 * @desc Gizped warc magic num:
 * - Buffer.from('1f8b08', 'hex')
 * - Uint8Array [ 31, 139, 8 ]
 * Not gziped warc magic num:
 * - Uint8Array [ 87, 65, 82 ]
 * @type {Buffer}
 */
const gzipMagicNum = Buffer.from('1f8b08', 'hex')

/**
 * @type {number} length of the gzip magic number _header 3 bytes
 */
const gzipMagicNumLen = gzipMagicNum.length

/**
 * Utility class that provides the means to detect if a file is gzipped or not
 */
class GzipDetector {
  /**
   * @desc Determines if a file is gzipped or not by reading its the magic number
   * @param {string} filePath - path to the file to detect
   * @return {Promise<boolean>} Promise that resolves to true if the file is gzipped false otherwise
   * @throws {Error} if the filePath is null or undefined or if another error occurred
   */
  static async isGzipped (filePath) {
    if (filePath == null) {
      throw new Error(`The filePath path is ${filePath}`)
    }
    filePath = untildify(filePath)
    const fd = await fs.open(filePath, 'r')
    const fillMe = Buffer.allocUnsafe(3)
    await fs.read(fd, fillMe, 0, 3, undefined)
    await fs.close(fd)
    let i = 0
    let isGzipped = true
    // should never happen as we create the Unit8Array to be size 3
    // but just in case
    if (gzipMagicNumLen !== fillMe.length) {
      return false
    }
    for (; i < gzipMagicNumLen; ++i) {
      if (gzipMagicNum[i] !== fillMe[i]) {
        isGzipped = false
        break
      }
    }
    return isGzipped
  }

  /**
   * @desc Synchronous version of {@link isGzipped}
   * @param {string} filePath - path to the file to detect
   * @return {boolean} true if the file is gzipped false otherwise
   * @throws {Error} if the filePath is null or undefined or if another error occurred
   */
  static isGzippedSync (filePath) {
    if (filePath == null) {
      throw new Error(`The filePath path is ${filePath}`)
    }
    filePath = untildify(filePath)
    const fd = fs.openSync(filePath, 'r')
    const fillMe = Buffer.allocUnsafe(3)
    fs.readSync(fd, fillMe, 0, 3, undefined)
    fs.closeSync(fd)
    let i = 0
    let isGzipped = true
    // should never happen as we create the Unit8Array to be size 3
    // but just in case
    if (gzipMagicNumLen !== fillMe.length) {
      return false
    }
    for (; i < gzipMagicNumLen; ++i) {
      if (gzipMagicNum[i] !== fillMe[i]) {
        isGzipped = false
        break
      }
    }
    return isGzipped
  }
}

/**
 * @type {GzipDetector}
 */
module.exports = GzipDetector
