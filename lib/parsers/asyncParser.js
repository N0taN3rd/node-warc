/** @ignore */
const untildify = require('untildify')
/** @ignore */
const fs = require('fs-extra')
/** @ignore */
const zlib = require('zlib')
const RecSepCounter = require('./recSepCounter')
const WARCRecorderBuilder = require('../warcRecordBuilder')
const GzipDetector = require('./gzipDetector')
const WFI = require('../warcRecordBuilder/fieldIdentifiers')

const rsc = new RecSepCounter()
const RB = new WARCRecorderBuilder()
const matcher = Buffer.from('\n')

function firstMatch (buf, offset) {
  if (offset >= buf.length) return -1
  let i = offset
  while (i < buf.length) {
    if (buf[i] === matcher[0]) {
      if (matcher.length > 1) {
        let fullMatch = true
        let j = i
        let k = 0
        while (j < i + matcher.length) {
          if (buf[j] !== matcher[k]) {
            fullMatch = false
            break
          }
          j += 1
          k += 1
        }
        if (fullMatch) return j - matcher.length
      } else {
        break
      }
    }
    i += 1
  }
  return i + matcher.length - 1
}


try {
  module.exports = async function * readWARC (warcPath) {
    const wp = untildify(warcPath)
    let buffered
    let offset, lastMatch, chunk, idx
    let lastBegin, buildKey, isEmptyLine, line
    let starting = true
    let checkRecType = false
    const isGZ = await GzipDetector.isGzipped(wp)
    let readStream
    if (isGZ) {
      readStream = fs.createReadStream(wp).pipe(zlib.createGunzip())
    } else {
      readStream = fs.createReadStream(wp)
    }
    for await (chunk of readStream) {
      offset = 0
      lastMatch = 0
      if (buffered) {
        chunk = Buffer.concat([buffered, chunk])
        offset = buffered.length
        buffered = undefined
      }
      while (true) {
        idx = firstMatch(chunk, offset - matcher.length + 1)
        if (idx !== -1 && idx < chunk.length) {
          line = chunk.slice(lastMatch, idx)
          offset = idx + matcher.length
          lastMatch = offset
          if (line.indexOf(WFI.begin) === 0) {
            if (!starting) {
              yield RB.buildRecord(buildKey)
            } else {
              starting = false
            }
            rsc.reset()
            checkRecType = true
            lastBegin = line
          } else {
            isEmptyLine = WFI.empty.equals(line)
            if (checkRecType && !isEmptyLine) {
              checkRecType = false
              buildKey = RB.determineWarcType(line, lastBegin)
            } else if (isEmptyLine) {
              rsc.increment()
            } else {
              RB.addLineTo(buildKey, rsc.count, line)
            }
          }
        } else {
          buffered = chunk.slice(lastMatch)
          break
        }
      }
    }
  }
} catch (e) {
  module.exports = async function (warcPath) {
    console.log(`Node version = ${
      process.version
    } does not support async iterators sry :'(
Please use one of the non-async parsers.`)
  }
}
