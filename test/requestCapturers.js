import test from 'ava'
import fs from 'fs-extra'
import { requestsJson } from './helpers/filePaths'
import { FakeNetwork } from './helpers/mocks'
import { RemoteChromeCapturer, ElectronCapturer } from '../lib/requestCapturers'
import CapturedRequest from '../lib/requestCapturers/capturedRequest'

let rawRequests
const numCaptReqs = 194
const numReqInfo = 244
test.before(async t => {
  rawRequests = await fs.readJson(requestsJson)
})

test.beforeEach(t => {
  t.context.network = new FakeNetwork(rawRequests)
  t.context.haveReqId = '6230.258'
})

test('RemoteChromeCapturer should set up correctly when no navMan is supplied', t => {
  const { context: { network } } = t
  const chromeRC = new RemoteChromeCapturer(network)
  t.is(
    chromeRC.requestWillBeSent,
    network.rwbs,
    'the chrome capturer should set the requestWillBeSent callback of the network'
  )
  t.is(
    chromeRC.responseReceived,
    network.rr,
    'the chrome capturer should set the responseReceived callback of the network'
  )
})


test('RemoteChromeCapturer should set up correctly when a navMan is not supplied to the constructor but added with withNavigationManager', t => {
  const { context: { network } } = t
  const chromeRC = new RemoteChromeCapturer(network)
  t.is(
    chromeRC.requestWillBeSent,
    network.rwbs,
    'the chrome capturer should set the requestWillBeSent callback of the network'
  )
  t.is(
    chromeRC.responseReceived,
    network.rr,
    'the chrome capturer should set the responseReceived callback of the network'
  )
  t.is(
    chromeRC.loadingFinished,
    network.lfin,
    'the chrome capturer should set the loadingFinished callback of the network'
  )
  t.is(
    chromeRC.loadingFailed,
    network.lfa,
    'the chrome capturer should set the loadingFailed callback of the network'
  )
})

test('RemoteChromeCapturer should set and unset the capture flag', t => {
  const { context: { network } } = t
  const chromeRC = new RemoteChromeCapturer(network)
  t.true(chromeRC._capture, 'the capture flag should be true when first created')
  chromeRC.stopCapturing()
  t.false(
    chromeRC._capture,
    'the capture flag should be false when stopCapturing is called'
  )
  chromeRC.startCapturing()
  t.true(
    chromeRC._capture,
    'the capture flag should be true when startCapturing is called after a stopCapturing call'
  )
})

test('RemoteChromeCapturer should capture requests when the capture flag is true', t => {
  const { context: { network } } = t
  const chromeRC = new RemoteChromeCapturer(network)
  network.go()
  t.is(
    chromeRC._requests.size,
    numCaptReqs,
    'there should be requests in the request map when the capture flag is true'
  )
})

test('RemoteChromeCapturer should not capture requests when the capture flag is false', t => {
  const { context: { network } } = t
  const chromeRC = new RemoteChromeCapturer(network)
  chromeRC.stopCapturing()
  network.go()
  t.is(
    chromeRC._requests.size,
    0,
    'there should not be any requests in the request map when the capture flag is false'
  )
})

test('RemoteChromeCapturer calling startCapturing should clear the request map', t => {
  const { context: { network } } = t
  const chromeRC = new RemoteChromeCapturer(network)
  network.go()
  t.is(
    chromeRC._requests.size,
    numCaptReqs,
    'there should be requests in the request map when the capture flag is true'
  )
  chromeRC.startCapturing()
  t.is(
    chromeRC._requests.size,
    0,
    'there should not be any requests in the request map after calling startCapturing when it was populated'
  )
})

test('RemoteChromeCapturer calling clear should clear the request map', t => {
  const { context: { network } } = t
  const chromeRC = new RemoteChromeCapturer(network)
  network.go()
  t.is(
    chromeRC._requests.size,
    numCaptReqs,
    'there should be requests in the request map when the capture flag is true'
  )
  chromeRC.clear()
  t.is(
    chromeRC._requests.size,
    0,
    'there should not be any requests in the request map after calling clear when it was populated'
  )
})

test('RemoteChromeCapturer iterator returning methods should return non-empty iterators when the request map is populated', t => {
  const { context: { network } } = t
  const chromeRC = new RemoteChromeCapturer(network)
  network.go()
  t.is(
    chromeRC._requests.size,
    numCaptReqs,
    'there should be requests in the request map when the capture flag is true'
  )
  t.is(
    Array.from(chromeRC[Symbol.iterator]()).length,
    numCaptReqs,
    'chromeRC[Symbol.iterator]() should have an non-empty iterator'
  )
  t.is(
    Array.from(chromeRC.entries()).length,
    numCaptReqs,
    'chromeRC.entries() should have an non-empty iterator'
  )
  t.is(
    Array.from(chromeRC.keys()).length,
    numCaptReqs,
    'chromeRC.keys() should have an non-empty iterator'
  )
  t.is(
    Array.from(chromeRC.values()).length,
    numCaptReqs,
    'chromeRC.values() should have an non-empty iterator'
  )
  t.is(
    Array.from(chromeRC.iterateRequests()).length,
    numReqInfo,
    'chromeRC.iterateRequests() should have an non-empty iterator'
  )
})

test('RemoteChromeCapturer map like methods should work as expected', t => {
  const { context: { network, haveReqId } } = t
  const chromeRC = new RemoteChromeCapturer(network)
  network.go()
  t.is(
    chromeRC._requests.size,
    numCaptReqs,
    'there should be requests in the request map when the capture flag is true'
  )
  t.true(
    chromeRC.has(haveReqId),
    'RemoteChromeCapturer should indicate it has a request by its id'
  )
  t.true(
    chromeRC.get(haveReqId) instanceof CapturedRequest,
    'RemoteChromeCapturer should retrieve the corresponding CapturedRequest object for the id'
  )
  t.false(
    chromeRC.has('9'),
    'RemoteChromeCapturer should indicate it does not have a request by its id'
  )
  let c = 0
  chromeRC.forEach(() => {
    c += 1
  })
  t.is(c, numCaptReqs, 'the forEach method should be applied to each captured request')
})

test('RemoteChromeCapturer should handle the case of no request but response', t => {
  const { context: { network } } = t
  const chromeRC = new RemoteChromeCapturer(network)
  chromeRC.requestWillBeSent({
    requestId: '1',
    request: {
      url: 'http://hi.com',
      method: 'GET',
      headers: {}
    }
  })
  t.is(
    chromeRC._requests.size,
    1,
    'after a request was sent the requests map should be size 1'
  )
  t.true(
    chromeRC.has('1'),
    'after a request was  sent the request map should have the id of the request'
  )
  chromeRC.responseReceived({
    requestId: '1',
    response: {
      url: 'http://hi.com',
      requestHeaders: {},
      requestHeadersText: '',
      responseHeaders: {},
      responseHeadersText: '',
      status: 200,
      statusText: 'OK',
      protocol: 'HTTP/1.1'
    }
  })
  t.is(
    chromeRC._requests.size,
    1,
    'after a response was received the requests map should still be size 1'
  )
  t.true(
    chromeRC.has('1'),
    'after a response was received the request map should still have the id of the request'
  )
  chromeRC.responseReceived({
    requestId: '2',
    response: {
      url: 'http://hi2.com',
      requestHeaders: {},
      requestHeadersText: '',
      responseHeaders: {},
      responseHeadersText: '',
      status: 200,
      statusText: 'OK',
      protocol: 'HTTP/1.1'
    }
  })
  t.is(
    chromeRC._requests.size,
    2,
    'after a response was received but no request was seen for it the requests map should include this response'
  )
  t.true(
    chromeRC.has('2'),
    'after a response was received but no request was seen for it  the request map should still have the id of the request'
  )
})

/* electron */

test('ElectronCapturer should set and unset the capture flag', t => {
  const electronRC = new ElectronCapturer()
  t.true(electronRC._capture, 'the capture flag should be true when first created')
  electronRC.stopCapturing()
  t.false(
    electronRC._capture,
    'the capture flag should be false when stopCapturing is called'
  )
  electronRC.startCapturing()
  t.true(
    electronRC._capture,
    'the capture flag should be true when startCapturing is called after a stopCapturing call'
  )
})

test('ElectronCapturer should capture requests when the capture flag is true attach', t => {
  const { context: { network } } = t
  const electronRC = new ElectronCapturer()
  electronRC.attach(network)
  network.goElectronAttach()
  t.is(
    electronRC._requests.size,
    numCaptReqs,
    'there should be requests in the request map when the capture flag is true'
  )
})

test('ElectronCapturer should capture requests when the capture flag is true maybeNetworkMessage', t => {
  const { context: { network } } = t
  const electronRC = new ElectronCapturer()
  network.goElectronMNM(electronRC.maybeNetworkMessage)
  t.is(
    electronRC._requests.size,
    numCaptReqs,
    'there should be requests in the request map when the capture flag is true'
  )
})

test('ElectronCapturer should not capture requests when the capture flag is false attach', t => {
  const { context: { network } } = t
  const electronRC = new ElectronCapturer()
  electronRC.attach(network)
  electronRC.stopCapturing()
  network.goElectronAttach()
  t.is(
    electronRC._requests.size,
    0,
    'there should not be any requests in the request map when the capture flag is false'
  )
})

test('ElectronCapturer should not capture requests when the capture flag is false maybeNetworkMessage', t => {
  const { context: { network } } = t
  const electronRC = new ElectronCapturer()
  electronRC.stopCapturing()
  network.goElectronMNM(electronRC.maybeNetworkMessage)
  t.is(
    electronRC._requests.size,
    0,
    'there should not be any requests in the request map when the capture flag is false'
  )
})

test('ElectronCapturer calling startCapturing should clear the request map attach', t => {
  const { context: { network } } = t
  const electronRC = new ElectronCapturer()
  electronRC.attach(network)
  network.goElectronAttach()
  t.is(
    electronRC._requests.size,
    numCaptReqs,
    'there should be requests in the request map when the capture flag is true'
  )
  electronRC.startCapturing()
  t.is(
    electronRC._requests.size,
    0,
    'there should not be any requests in the request map after calling startCapturing when it was populated'
  )
})

test('ElectronCapturer calling startCapturing should clear the request map maybeNetworkMessage', t => {
  const { context: { network } } = t
  const electronRC = new ElectronCapturer()
  network.goElectronMNM(electronRC.maybeNetworkMessage)
  t.is(
    electronRC._requests.size,
    numCaptReqs,
    'there should be requests in the request map when the capture flag is true'
  )
  electronRC.startCapturing()
  t.is(
    electronRC._requests.size,
    0,
    'there should not be any requests in the request map after calling startCapturing when it was populated'
  )
})

test('ElectronCapturer calling clear should clear the request map attach', t => {
  const { context: { network } } = t
  const electronRC = new ElectronCapturer()
  electronRC.attach(network)
  network.goElectronAttach()
  t.is(
    electronRC._requests.size,
    numCaptReqs,
    'there should be requests in the request map when the capture flag is true'
  )
  electronRC.clear()
  t.is(
    electronRC._requests.size,
    0,
    'there should not be any requests in the request map after calling clear when it was populated'
  )
})

test('ElectronCapturer calling clear should clear the request map maybeNetworkMessage', t => {
  const { context: { network } } = t
  const electronRC = new ElectronCapturer()
  network.goElectronMNM(electronRC.maybeNetworkMessage)
  t.is(
    electronRC._requests.size,
    numCaptReqs,
    'there should be requests in the request map when the capture flag is true'
  )
  electronRC.clear()
  t.is(
    electronRC._requests.size,
    0,
    'there should not be any requests in the request map after calling clear when it was populated'
  )
})

test('ElectronCapturer iterator returning methods should return non-empty iterators when the request map is populated attach', t => {
  const { context: { network } } = t
  const electronRC = new ElectronCapturer()
  electronRC.attach(network)
  network.goElectronAttach()
  t.is(
    electronRC._requests.size,
    numCaptReqs,
    'there should be requests in the request map when the capture flag is true'
  )
  t.is(
    Array.from(electronRC[Symbol.iterator]()).length,
    numCaptReqs,
    'electronRC[Symbol.iterator]() should have an non-empty iterator'
  )
  t.is(
    Array.from(electronRC.entries()).length,
    numCaptReqs,
    'electronRC.entries() should have an non-empty iterator'
  )
  t.is(
    Array.from(electronRC.keys()).length,
    numCaptReqs,
    'electronRC.keys() should have an non-empty iterator'
  )
  t.is(
    Array.from(electronRC.values()).length,
    numCaptReqs,
    'electronRC.values() should have an non-empty iterator'
  )
  t.is(
    Array.from(electronRC.iterateRequests()).length,
    numReqInfo,
    'electronRC.iterateRequests() should have an non-empty iterator'
  )
})

test('ElectronCapturer iterator returning methods should return non-empty iterators when the request map is populated maybeNetworkMessage', t => {
  const { context: { network } } = t
  const electronRC = new ElectronCapturer()
  network.goElectronMNM(electronRC.maybeNetworkMessage)
  t.is(
    electronRC._requests.size,
    numCaptReqs,
    'there should be requests in the request map when the capture flag is true'
  )
  t.is(
    Array.from(electronRC[Symbol.iterator]()).length,
    numCaptReqs,
    'electronRC[Symbol.iterator]() should have an non-empty iterator'
  )
  t.is(
    Array.from(electronRC.entries()).length,
    numCaptReqs,
    'electronRC.entries() should have an non-empty iterator'
  )
  t.is(
    Array.from(electronRC.keys()).length,
    numCaptReqs,
    'electronRC.keys() should have an non-empty iterator'
  )
  t.is(
    Array.from(electronRC.values()).length,
    numCaptReqs,
    'electronRC.values() should have an non-empty iterator'
  )
  t.is(
    Array.from(electronRC.iterateRequests()).length,
    numReqInfo,
    'electronRC.iterateRequests() should have an non-empty iterator'
  )
  let c = 0
  electronRC.forEach(() => {
    c += 1
  })
  t.is(c, numCaptReqs, 'the forEach method should be applied to each captured request')
})

test('ElectronCapturer map like methods should work as expected attach ', t => {
  const { context: { network, haveReqId } } = t
  const electronRC = new ElectronCapturer()
  electronRC.attach(network)
  network.goElectronAttach()
  t.is(
    electronRC._requests.size,
    numCaptReqs,
    'there should be requests in the request map when the capture flag is true'
  )
  t.true(
    electronRC.has(haveReqId),
    'ElectronCapturer should indicate it has a request by its id'
  )
  t.true(
    electronRC.get(haveReqId) instanceof CapturedRequest,
    'ElectronCapturer should retrieve the corresponding CapturedRequest object for the id'
  )
  t.false(
    electronRC.has('9'),
    'ElectronCapturer should indicate it does not have a request by its id'
  )
})

test('ElectronCapturer map like methods should work as expected maybeNetworkMessage', t => {
  const { context: { network, haveReqId } } = t
  const electronRC = new ElectronCapturer()
  network.goElectronMNM(electronRC.maybeNetworkMessage)
  t.is(
    electronRC._requests.size,
    numCaptReqs,
    'there should be requests in the request map when the capture flag is true'
  )
  t.true(
    electronRC.has(haveReqId),
    'ElectronCapturer should indicate it has a request by its id'
  )
  t.true(
    electronRC.get(haveReqId) instanceof CapturedRequest,
    'ElectronCapturer should retrieve the corresponding CapturedRequest object for the id'
  )
  t.false(
    electronRC.has('9'),
    'ElectronCapturer should indicate it does not have a request by its id'
  )
})

test('ElectronCapturer should handle the case of no request but response', t => {
  const electronRC = new ElectronCapturer()
  electronRC.requestWillBeSent({
    requestId: '1',
    request: {
      url: 'http:/hi.com',
      method: 'GET',
      headers: {}
    }
  })
  t.is(
    electronRC._requests.size,
    1,
    'after a request was sent the requests map should be size 1'
  )
  t.true(
    electronRC.has('1'),
    'after a request was  sent the request map should have the id of the request'
  )
  electronRC.responseReceived({
    requestId: '1',
    response: {
      url: 'http:/hi.com',
      requestHeaders: {},
      requestHeadersText: '',
      responseHeaders: {},
      responseHeadersText: '',
      status: 200,
      statusText: 'OK',
      protocol: 'HTTP/1.1'
    }
  })
  t.is(
    electronRC._requests.size,
    1,
    'after a response was received the requests map should still be size 1'
  )
  t.true(
    electronRC.has('1'),
    'after a response was received the request map should still have the id of the request'
  )
  electronRC.responseReceived({
    requestId: '2',
    response: {
      url: 'http:/hi.com',
      requestHeaders: {},
      requestHeadersText: '',
      responseHeaders: {},
      responseHeadersText: '',
      status: 200,
      statusText: 'OK',
      protocol: 'HTTP/1.1'
    }
  })
  t.is(
    electronRC._requests.size,
    2,
    'after a response was received but no request was seen for it the requests map should include this response'
  )
  t.true(
    electronRC.has('2'),
    'after a response was received but no request was seen for it  the request map should still have the id of the request'
  )
})
