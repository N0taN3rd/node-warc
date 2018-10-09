const { kMaxLength } = require('buffer')
const os = require('os')
const zlib = require('zlib')
const fs = require('fs-extra')

class LineReader {
  /**
   * @param {?string} file
   * @param {Object} [opts = {chunkSize: 1024, nlc: 0x0a}]
   */
  constructor (file = null, opts = {}) {
    let { chunkSize = 1024, lineEnd = os.EOL } = opts
    /**
     * @type {number}
     */
    this._chunkSize = chunkSize

    /**
     * @type {Buffer}
     */
    this.lineEnd = Buffer.from(lineEnd)

    /**
     * @type {boolean}
     */
    this.eofReached = false

    this.linesCache = []

    /**
     * @type {number}
     */
    this.fdPosition = 0

    /**
     * @type {?number}
     */
    this.fd = null

    /**
     * @type {?number}
     */
    this._remainingBytes = null

    if (file != null) {
      this.open(file)
    }
  }

  open (file) {
    this.close()
    this.reset()
    const stat = fs.statSync(file)
    this._remainingBytes = stat.size
    this.fd = fs.openSync(file, 'r')
  }

  close () {
    if (this.fd) {
      fs.closeSync(this.fd)
    }
    this.fd = null
  }

  reset () {
    this.eofReached = false
    this.linesCache = []
    this.fdPosition = 0
    this._remainingBytes = -1
  }

  _nextReadSizeInBounds () {
    let nextReadChunk
    if (this._remainingBytes - this._chunkSize < this._chunkSize) {
      nextReadChunk = this._remainingBytes
    } else {
      nextReadChunk = this._chunkSize
    }
    this._remainingBytes -= nextReadChunk
    return nextReadChunk
  }

  readLine () {
    if (!this.fd) {
      throw new Error('No file supplied for reading')
    }

    let line = null

    if (this.eofReached && this.linesCache.length === 0) {
      return line
    }

    let bytesRead

    if (!this.linesCache.length) {
      bytesRead = this._readChunk()
    }

    if (this.linesCache.length) {
      line = this.linesCache.shift()
      if (line[line.length - 1] !== this.nlc) {
        bytesRead = this._readChunk(line)

        if (bytesRead) {
          line = this.linesCache.shift()
        }
      }
    }

    if (this.eofReached && this.linesCache.length === 0) {
      this.close()
    }

    if (line && line[line.length - 1] === this.nlc) {
      line = line.slice(0, line.length - 1)
    }

    return line
  }
}

function openFileGetSize (fp) {
  const stat = fs.statSync(fp)
  const fd = fs.openSync(fp, 'r')
  console.log(`opened ${fp} size = ${stat.size}`)
  return { stat, fd }
}

const gzipped =
  '/home/john/PycharmProjects/pywb/collections/t/archive/youtube_embedded-20180722073428.warc.gz'
const reg = 'test/files/parseMe.warc'

function computeNextChunkSize (remainingBytes, chunkSize) {
  let nextSize = remainingBytes - chunkSize
  if (nextSize < chunkSize) {
    return remainingBytes
  }
  return chunkSize
}

let nextChunkSize

class LineBuffer {
  constructor (matcher) {
    this.matcher = Buffer.from(matcher || os.EOL)
    this.buffered = undefined
    this.lines = []
  }

  get length () {
    return this.lines.length
  }

  shift () {
    return this.lines.shift()
  }

  firstMatch (buf, offset) {
    if (offset >= buf.length) return -1
    let i = offset
    let fullMatch = true
    let j = i
    let k = 0
    while (i < buf.length) {
      if (buf[i] === this.matcher[0]) {
        if (this.matcher.length > 1) {
          fullMatch = true
          j = i
          k = 0
          while (j < i + this.matcher.length) {
            if (buf[j] !== this.matcher[k]) {
              fullMatch = false
              break
            }
            j += 1
            k += 1
          }
          if (fullMatch) return j - this.matcher.length
        } else {
          break
        }
      }
      i += 1
    }
    return i + this.matcher.length - 1
  }

  extractLines (buf) {
    let offset = 0
    let lastMatch = 0
    if (this.buffered) {
      buf = Buffer.concat([this.buffered, buf])
      offset = this.buffered.length
      this.buffered = undefined
    }
    let idx
    while (true) {
      idx = this.firstMatch(buf, offset - this.matcher.length + 1)
      if (idx !== -1 && idx < buf.length) {
        this.lines.push(buf.slice(lastMatch, idx))
        offset = idx + this.matcher.length
        lastMatch = offset
      } else {
        this.buffered = buf.slice(lastMatch)
        console.log('buffering')
        break
      }
    }
  }
}

const lineBuffer = new LineBuffer('\r\n')

function zlibBufferSync (engine, buffer) {
  if (typeof buffer === 'string') {
    buffer = Buffer.from(buffer)
  } else if (!isArrayBufferView(buffer)) {
    if (isAnyArrayBuffer(buffer)) {
      buffer = Buffer.from(buffer)
    } else {
      throw new ERR_INVALID_ARG_TYPE(
        'buffer',
        ['string', 'Buffer', 'TypedArray', 'DataView', 'ArrayBuffer'],
        buffer
      )
    }
  }
  buffer = processChunkSync(engine, buffer, engine._finishFlushFlag)
  if (engine._info) return { buffer, engine }
  return buffer
}

const assert = require('assert')

class SyncUnGzip {
  constructor () {
    this._gunzip = zlib.createGunzip({
      flush: zlib.constants.Z_PARTIAL_FLUSH,
      finishFlush: zlib.constants.Z_PARTIAL_FLUSH
    })
  }

  process (chunk) {
    let availInBefore = chunk.byteLength
    let availOutBefore = this._gunzip._chunkSize - this._gunzip._outOffset
    let inOff = 0
    let availOutAfter
    let availInAfter
    let buffers = null
    let nread = 0
    let inputRead = 0
    let state = this._gunzip._writeState
    let handle = this._gunzip._handle
    let buffer = this._gunzip._outBuffer
    let offset = this._gunzip._outOffset
    let chunkSize = this._gunzip._chunkSize
    const onError = function onError (er) {
      error = er
    }
    let error
    this._gunzip.on('error', onError)

    while (true) {
      handle.writeSync(
        this._gunzip._finishFlushFlag,
        chunk, // in
        inOff, // in_off
        availInBefore, // in_len
        buffer, // out
        offset, // out_off
        availOutBefore
      ) // out_len
      if (error) throw error

      availOutAfter = state[0]
      availInAfter = state[1]

      var inDelta = availInBefore - availInAfter
      inputRead += inDelta

      var have = availOutBefore - availOutAfter
      if (have > 0) {
        var out = buffer.slice(offset, offset + have)
        offset += have
        if (!buffers) buffers = [out]
        else buffers.push(out)
        nread += out.byteLength
      } else if (have < 0) {
        assert(false, 'have should not go down')
      }

      // exhausted the output buffer, or used all the input create a new one.
      if (availOutAfter === 0 || offset >= chunkSize) {
        availOutBefore = chunkSize
        offset = 0
        buffer = Buffer.allocUnsafe(chunkSize)
      }

      if (availOutAfter === 0) {
        // Not actually done. Need to reprocess.
        // Also, update the availInBefore to the availInAfter value,
        // so that if we have to hit it a third (fourth, etc.) time,
        // it'll have the correct byte counts.
        inOff += inDelta
        availInBefore = availInAfter
      } else {
        break
      }
    }

    console.log(this._gunzip)
    this._gunzip.flush()

    this._gunzip._finishFlushFlag.bytesWritten = inputRead

    if (nread >= kMaxLength) {
      throw new Error('ERR_BUFFER_TOO_LARGE')
    }

    if (nread === 0) return Buffer.alloc(0)

    this._gunzip.removeListener('error', onError)

    let returned =
      buffers.length === 1 ? buffers[0] : Buffer.concat(buffers, nread)
    if (this._gunzip._info) return { buffer: returned, engine: this._gunzip }
    return buffer
  }
}

const ungz = new SyncUnGzip()

const { stat, fd } = openFileGetSize(gzipped)
let readBuffer

let chunkSize = 1024
let bytesRead
let fdPosition = 0

let remainingFileSize = stat.size

process.on('SIGINT', () => {
  fs.closeSync(fd)
})

try {
  while (true) {
    nextChunkSize = computeNextChunkSize(remainingFileSize, chunkSize)
    if (!readBuffer || nextChunkSize !== chunkSize) {
      console.log('allocing')
      readBuffer = Buffer.alloc(nextChunkSize, 0)
    }
    bytesRead = fs.readSync(fd, readBuffer, 0, nextChunkSize, fdPosition)
    fdPosition += bytesRead
    remainingFileSize -= nextChunkSize
    console.log(ungz.process(readBuffer))
    // lineBuffer.extractLines(readBuffer)
    // while (lineBuffer.length > 0) {
    //   console.log(lineBuffer.shift())
    // }

    if (remainingFileSize === 0) break
  }
} catch (e) {
  console.error(e)
} finally {
  fs.closeSync(fd)
}
