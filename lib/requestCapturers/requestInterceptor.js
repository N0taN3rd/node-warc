/** @ignore */
const uuid = require('uuid/v1')

const contentEncoding = 'Content-Encoding'

class RequestInterceptor {
  constructor () {
    this._capture = true
    this._requests = new Map()
  }

  /**
   * @desc Sets an internal flag to begin capturing network requests
   */
  startCapturing () {
    this._requests.clear()
    this._capture = true
  }

  /**
   * @desc Sets an internal flag to stop the capturing network requests
   */
  stopCapturing () {
    this._capture = false
  }

  /**
   * @desc Handles the Network.requestWillBeSent event
   * @see https://chromedevtools.github.io/devtools-protocol/tot/Network/#event-requestWillBeSent
   * @param {Object} info
   */
  requestWillBeSent (info) {
    if (this._capture) {
      if (this._requests.has(info.requestId)) {
        if (info.redirectResponse) {
          if (this._requests.get(info.requestId).redirectResponse) {
            let cr = this._requests.get(info.requestId)
            if (Array.isArray(cr.redirectResponse)) {
              cr.redirectResponse.push({
                url: info.redirectResponse.url,
                status: info.redirectResponse.status,
                statusText: info.redirectResponse.statusText,
                headers: info.redirectResponse.headers,
                headersText: info.redirectResponse.headersText,
                requestHeaders: info.redirectResponse.requestHeaders || info.headers,
                requestHeadersText: info.redirectResponse.requestHeadersText,
                method: info.redirectResponse.method,
                protocol: info.redirectResponse.protocol
              })
              this._requests.set(info.requestId, cr)
            } else {
              let oldRR = cr.redirectResponse
              cr.redirectResponse = [oldRR, {
                url: info.redirectResponse.url,
                status: info.redirectResponse.status,
                statusText: info.redirectResponse.statusText,
                headers: info.redirectResponse.headers,
                headersText: info.redirectResponse.headersText,
                requestHeaders: info.redirectResponse.requestHeaders || info.headers,
                requestHeadersText: info.redirectResponse.requestHeadersText,
                method: info.redirectResponse.method,
                protocol: info.redirectResponse.protocol
              }]
              this._requests.set(info.requestId, cr)
            }
          } else {
            this._requests.get(info.requestId).redirectResponse = {
              url: info.redirectResponse.url,
              status: info.redirectResponse.status,
              statusText: info.redirectResponse.statusText,
              headers: info.redirectResponse.headers,
              headersText: info.redirectResponse.headersText,
              requestHeaders: info.redirectResponse.requestHeaders || info.headers,
              requestHeadersText: info.redirectResponse.requestHeadersText,
              method: info.redirectResponse.method,
              protocol: info.redirectResponse.protocol
            }
          }
        } else {
          // was double request currently seems like a bug
          // only happens when chrome is angry with us
          // docs state that RequestId is unique and if
          // redirect response is not on the object
          // this should never happen or does it ????
          let maybeRes = this._requests.get(info.requestId)
          if (
            (maybeRes.headers === null || maybeRes.headers === undefined) &&
            (maybeRes.method === null || maybeRes.method === undefined) &&
            (maybeRes.url === null || maybeRes.url === undefined) &&
            (maybeRes.res !== null && maybeRes.res !== undefined)
          ) {
            // we found you!
            maybeRes.url = info.request.url
            maybeRes.headers = info.request.headers
            maybeRes.method = info.request.method
            if (info.request.postData !== undefined && info.request.postData !== null) {
              maybeRes.postData = info.request.postData
            }
            this._requests.set(info.requestId, maybeRes)
          } else {
            let captured = {
              requestId: info.requestId,
              url: info.request.url,
              headers: info.request.headers,
              method: info.request.method
            }
            if (info.redirectResponse !== undefined && info.redirectResponse !== null) {
              captured.redirectResponse = info.redirectResponse
            }
            if (info.request.postData !== undefined && info.request.postData !== null) {
              captured.postData = info.request.postData
            }
            this._requests.set(`${info.requestId}${uuid()}`, captured)
          }
        }
      } else {
        let captured = {
          requestId: info.requestId,
          url: info.request.url,
          headers: info.request.headers,
          method: info.request.method
        }
        if (info.redirectResponse !== undefined && info.redirectResponse !== null) {
          captured.redirectResponse = info.redirectResponse
        }
        if (info.request.postData !== undefined && info.request.postData !== null) {
          captured.postData = info.request.postData
        }
        this._requests.set(info.requestId, captured)
      }
    }
  }

  /**
   * @desc Handles the Network.responseReceived event
   * @see https://chromedevtools.github.io/devtools-protocol/tot/Network/#event-responseReceived
   * @param {Object} info
   */
  responseReceived (info) {
    if (info.response.headers) {
      console.log(info.response.headers)
    } else if (info.response.headersText) {
      console.log(info.response.headersText)
    }
    if (this._capture) {
      if (!this._requests.has(info.requestId)) {
        let captured = {
          url: info.response.url,
          res: {
            url: info.response.url,
            status: info.response.status,
            statusText: info.response.statusText,
            headers: info.response.headers,
            headersText: info.response.headersText,
            requestHeaders: info.response.requestHeaders,
            requestHeadersText: info.response.requestHeadersText,
            protocol: info.response.protocol
          },
          requestId: info.requestId
        }
        if (captured.res.requestHeaders !== null && captured.res.requestHeaders !== undefined) {
          let method = captured.res.requestHeaders[':method']
          if (method && method !== '') {
            // http2 why you do this to me
            captured.headers = captured.res.requestHeaders
            captured.url = captured.res.url
            captured.method = method
          }
        }
        this._requests.set(info.requestId, captured)
      } else {
        let res = this._requests.get(info.requestId).res
        if (res) {
          if (Array.isArray(res)) {
            this._requests.get(info.requestId).res.push({
              url: info.response.url,
              status: info.response.status,
              statusText: info.response.statusText,
              headers: info.response.headers,
              headersText: info.response.headersText,
              requestHeaders: info.response.requestHeaders,
              requestHeadersText: info.response.requestHeadersText,
              protocol: info.response.protocol
            })
          } else {
            this._requests.get(info.requestId).res = [res, {
              url: info.response.url,
              status: info.response.status,
              statusText: info.response.statusText,
              headers: info.response.headers,
              headersText: info.response.headersText,
              requestHeaders: info.response.requestHeaders,
              requestHeadersText: info.response.requestHeadersText,
              protocol: info.response.protocol
            }]
          }
        } else {
          let compression

          this._requests.get(info.requestId).res = {
            url: info.response.url,
            status: info.response.status,
            statusText: info.response.statusText,
            headers: info.response.headers,
            headersText: info.response.headersText,
            requestHeaders: info.response.requestHeaders,
            requestHeadersText: info.response.requestHeadersText,
            protocol: info.response.protocol
          }
        }
      }
    }
  }

  [Symbol.iterator] () {
    return this._requests[Symbol.iterator]()
  }

  clear () {
    this._requests.clear()
  }

  has (requestId) {
    return this._requests.has(requestId)
  }

  set (requestId, request) {
    return this._requests.set(requestId, request)
  }

  get (requestId) {
    return this._requests.get(requestId)
  }

  entries () {
    return this._requests.entries()
  }

  keys () {
    return this._requests.keys()
  }

  values () {
    return this._requests.values()
  }

  forEach (iteratee, thisArg) {
    this._requests.forEach(iteratee, thisArg)
  }
}

module.exports = RequestInterceptor
