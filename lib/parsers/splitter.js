/*
 Based on binary-split, Copyright (c) 2016 Max Ogden
*/
'use strict'
const os = require('os')
const { Transform } = require('stream')

class BinarySplit2 extends Transform {
  constructor (matcher, options = {}) {
    super(options)
    this.matcher = Buffer.from(matcher || os.EOL)
    this.buffered = undefined
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

  _transform (buf, enc, done) {
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
        this.push(buf.slice(lastMatch, idx))
        offset = idx + this.matcher.length
        lastMatch = offset
      } else {
        this.buffered = buf.slice(lastMatch)
        break
      }
    }

    done()
  }

  _flush (done) {
    if (this.buffered) {
      this.push(this.buffered)
    }
    done()
  }
}

function makeSplitter (matcher) {
  return new BinarySplit2(matcher)
}

module.exports = makeSplitter
module.exports.BinarySplit2 = BinarySplit2
