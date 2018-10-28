export class FakeElectronDebugger {
  constructor () {
    this.calls = 0
    this.commandSent = null
    this.args = null
    this._shouldError = false
  }

  sendCommand (command, args, cb) {
    this.calls += 1
    this.commandSent = command
    this.args = args
    if (this._shouldError) {
      cb({ args }, null)
    } else {
      cb(null, 'dummy')
    }
  }

  reset (shouldError) {
    this._shouldError = shouldError
    this.calls = 0
    this.commandSent = null
    this.args = null
  }
}

export class FakeNetwork {
  constructor (reqs) {
    this.reqs = reqs
  }

  requestWillBeSent (cb) {
    this.rwbs = cb
  }

  responseReceived (cb) {
    this.rr = cb
  }

  loadingFinished (cb) {
    this.lfin = cb
  }

  loadingFailed (cb) {
    this.lfa = cb
  }

  getResponseBody () {

  }

  findRequestRedirectResponse () {
    let i = 0
    let len = this.reqs.length
    let r
    const found = {}
    while (i < len) {
      r = this.reqs[i]
      if (r.response && !found.response) {
        found.response = r
      } else if (r.request && !r.redirectResponse && !found.request) {
        found.request = r
      } else if (r.redirectResponse && !found.redirectResponse) {
        found.redirectResponse = r
      }
      if (found.request && found.response && found.redirectResponse) {
        return found
      }
      i++
    }
  }

  go () {
    let i = 0
    let len = this.reqs.length
    let r
    while (i < len) {
      r = this.reqs[i]
      if (r.response) {
        this.rr(r)
      } else {
        this.rwbs(r)
      }
      i++
    }
  }

  goElectronAttach () {
    let i = 0
    let len = this.reqs.length
    let r
    while (i < len) {
      r = this.reqs[i]
      if (r.response) {
        this[this.what](undefined, 'Network.responseReceived', r)
      } else {
        this[this.what](undefined, 'Network.requestWillBeSent', r)
      }
      i++
    }
  }

  loadFinFailAttach () {
    this[this.what](undefined, 'Network.loadingFinished', {})
    this[this.what](undefined, 'Network.loadingFailed', {})
  }

  goElectronMNM (maybeNetworkMessage) {
    let i = 0
    let len = this.reqs.length
    let r
    while (i < len) {
      r = this.reqs[i]
      if (r.response) {
        maybeNetworkMessage('Network.responseReceived', r)
      } else {
        maybeNetworkMessage('Network.requestWillBeSent', r)
      }
      i++
    }
  }

  loadFinFailMNM (maybeNetworkMessage) {
    maybeNetworkMessage('Network.loadingFinished', {})
    maybeNetworkMessage('Network.loadingFailed', {})
  }

  on (what, cb) {
    this.what = what
    this[what] = cb
  }
}

export class FakeNavMan {
  constructor () {
    this.calls = { reqStarted: 0, reqFinished: 0 }
  }

  reqStarted (info) {
    this.calls.reqStarted += 1
  }

  reqFinished (info) {
    this.calls.reqFinished += 1
  }
}
