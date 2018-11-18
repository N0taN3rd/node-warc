import Module from 'module'
import zlib from 'zlib'
import fs from 'fs-extra'

export class CheckableWriteStream {
  constructor (path, options) {
    this.path = path
    this.options = options
    this.passedOnFinish = null
    this.passedOnError = null
    this.endCalled = false
    this.destroyCalled = false
    this.writeSequence = []
    this.drain = false
  }

  on (event, handler) {
    switch (event) {
      case 'finish':
        this.passedOnFinish = handler
        break
      case 'error':
        this.passedOnError = handler
        break
      default:
        console.log(event, handler)
        break
    }
  }

  getAWrite () {
    return this.writeSequence.shift()
  }

  numWrites () {
    return this.writeSequence.length
  }

  clearWrites () {
    this.writeSequence = []
  }

  once (event, handler) {
    console.log(event, handler)
  }

  write (buffer, encoding) {
    // console.log(buffer, encoding)
    this.writeSequence.push({ buffer, encoding })
    return !this.drain
  }

  destroy () {
    this.destroyCalled = true
  }

  end () {
    this.endCalled = true
  }

  removeAllListeners () {}
}

function createCheckableWriteStream (path, options) {
  return new CheckableWriteStream(path, options)
}

let gzipSyncCallCount = 0

const proxiedZlib = new Proxy(zlib, {
  get (target, p, receiver) {
    switch (p) {
      case 'gzipSync':
        gzipSyncCallCount += 1
        return target[p]
      case 'gzipSyncCallCount':
        return gzipSyncCallCount
      case 'reset':
        let oldCount = gzipSyncCallCount
        gzipSyncCallCount = 0
        return oldCount
      default:
        return target[p]
    }
  }
})

const proxiedFsExtra = new Proxy(fs, {
  get (target, p, receiver) {
    switch (p) {
      case 'createWriteStream':
        return createCheckableWriteStream
      default:
        return target[p]
    }
  }
})

const _require = Module.prototype.require
Module.prototype.require = function (id) {
  if (id === 'zlib') return proxiedZlib
  if (id === 'fs-extra') return proxiedFsExtra
  return _require.apply(this, arguments)
}

export default function () {
  Module.prototype.require = _require
}
