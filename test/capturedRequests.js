import test from 'ava'
import CapturedRequest from '../lib/requestCapturers/capturedRequest'
import fs from 'fs-extra'
import { capturedReqTestData } from './helpers/filePaths'

let d
test.before(async t => {
  d = await fs.readFile(capturedReqTestData)
})

test.beforeEach(t => {
  t.context.data = JSON.parse(d)
})

test('CapturedRequest should handle initialization with a request', t => {
  const req = t.context.data.req[0]
  const cr = CapturedRequest.newOne(req)
  t.truthy(cr, 'the newly created captured request using new one should not be undefined or null')
  t.is(cr.requestId, req.requestId, 'captured request id should be the same as the request object used to create it')
  t.is(cr._reqs.size, 1, 'captured request _reqs map should be of size one')
  t.is(Array.from(cr.keys())[0], req.request.url, 'captured request keys should return the url of the captured request')
  t.is(cr.url(), req.request.url, 'captured request url method should return the url of the captured request')
})

test('CapturedRequest should handle initialization with a response', t => {
  const redir = t.context.data.redir[2]
  const cr = CapturedRequest.newOne(redir)
  t.truthy(cr, 'the newly created captured request using new one should not be undefined or null')
  t.is(cr.requestId, redir.requestId, 'captured request id should be the same as the request object used to create it')
  t.is(cr._reqs.size, 1, 'captured request _reqs map should be of size one')
  t.is(Array.from(cr.keys())[0], redir.response.url, 'captured request keys should return the url of the captured request')
  t.is(cr.url(), redir.response.url, 'captured request url method should return the url of the captured request')
})

test('CapturedRequest should handle initialization with a redirection', t => {
  const redir = t.context.data.redir[1]
  const cr = CapturedRequest.newOne(redir)
  t.truthy(cr, 'the newly created captured request using new one should not be undefined or null')
  t.is(cr.requestId, redir.requestId, 'captured request id should be the same as the request object used to create it')
  t.is(cr._reqs.size, 2, 'captured request _reqs map should be of size one')
  t.deepEqual(Array.from(cr.keys()), [redir.redirectResponse.url, redir.request.url], 'captured request keys should return the url of the captured request')
  t.deepEqual(cr.url(), [redir.redirectResponse.url, redir.request.url], 'captured request url method should return the url of the captured request')
})

test('CapturedRequest should add the response to a redirection', t => {
  const {context: {data: {redir}}} = t
  const cr = CapturedRequest.newOne(redir[0])
  const expectedURL = [redir[0].request.url, redir[2].response.url]
  t.truthy(cr, 'the newly created captured request using new one should not be undefined or null')
  t.is(cr.requestId, redir[0].requestId, 'captured request id should be the same as the request object used to create it')
  t.is(cr._reqs.size, 1, 'captured request _reqs map should be of size one')
  cr.addRequestInfo(redir[1])
  cr.addRequestInfo(redir[2])
  t.deepEqual(Array.from(cr.keys()), expectedURL, 'captured request keys should return the url of the captured request')
  t.deepEqual(cr.url(), expectedURL, 'captured request url method should return the url of the captured request')
  t.is(cr._reqs.size, 2, 'captured request _reqs map should be of size 2')
})

test('CapturedRequest should add a new redirection if not already present', t => {
  const {context: {data: {redir}}} = t
  const cr = CapturedRequest.newOne(redir[0])
  t.truthy(cr, 'the newly created captured request using new one should not be undefined or null')
  t.is(cr.requestId, redir[0].requestId, 'captured request id should be the same as the request object used to create it')
  t.is(cr._reqs.size, 1, 'captured request _reqs map should be of size one')
  cr.addRequestInfo(redir[1])
  const newR = Object.assign({}, redir[1])
  newR.redirectResponse.url += 'kkk'
  newR.request.url += 'kkk'
  cr.addRequestInfo(newR)
  t.is(cr._reqs.size, 4, 'captured request _reqs map should be of size 3')
  const kar = Array.from(cr.keys())
  const urlar = cr.url()
  t.true(kar.indexOf(redir[0].request.url) !== -1, 'the original request url should be present')
  t.true(kar.indexOf(redir[1].redirectResponse.url) !== -1, 'the redirect url should be present')
  t.true(kar.indexOf(newR.redirectResponse.url) !== -1, 'the new redirect url should be present')
  t.true(kar.indexOf(newR.request.url) !== -1, 'the new request url should be present')
  t.true(urlar.indexOf(redir[0].request.url) !== -1, 'the original request url should be present')
  t.true(urlar.indexOf(redir[1].redirectResponse.url) !== -1, 'the redirect url should be present')
  t.true(urlar.indexOf(newR.redirectResponse.url) !== -1, 'the new redirect url should be present')
  t.true(urlar.indexOf(newR.request.url) !== -1, 'the new request url should be present')
})

test('CapturedRequest should add a new response if not already present', t => {
  const {context: {data: {redir, req}}} = t
  const cr = CapturedRequest.newOne(redir[0])
  t.truthy(cr, 'the newly created captured request using new one should not be undefined or null')
  t.is(cr.requestId, redir[0].requestId, 'captured request id should be the same as the request object used to create it')
  t.is(cr._reqs.size, 1, 'captured request _reqs map should be of size one')
  cr.addRequestInfo(redir[1])
  cr.addRequestInfo(req[1])
  t.is(cr._reqs.size, 3, 'captured request _reqs map should be of size 3')
  const kar = Array.from(cr.keys())
  const urlar = cr.url()
  t.true(kar.indexOf(redir[0].request.url) !== -1, 'the original request url should be present')
  t.true(kar.indexOf(redir[1].redirectResponse.url) !== -1, 'the redirect url should be present')
  t.true(kar.indexOf(req[1].response.url) !== -1, 'the new response url should be present')
  t.true(urlar.indexOf(redir[0].request.url) !== -1, 'the original request url should be present')
  t.true(urlar.indexOf(redir[1].redirectResponse.url) !== -1, 'the redirect url should be present')
  t.true(urlar.indexOf(req[1].response.url) !== -1, 'the new response url should be present')
})

test('CapturedRequest should add a new request if not already present', t => {
  const {context: {data: {redir, req}}} = t
  const cr = CapturedRequest.newOne(req[0])
  t.truthy(cr, 'the newly created captured request using new one should not be undefined or null')
  t.is(cr.requestId, req[0].requestId, 'captured request id should be the same as the request object used to create it')
  t.is(cr._reqs.size, 1, 'captured request _reqs map should be of size one')
  cr.addRequestInfo(redir[0])
  cr.addRequestInfo(req[1])
  t.is(cr._reqs.size, 2, 'captured request _reqs map should be of size 2')
  const kar = Array.from(cr.keys())
  const urlar = cr.url()
  t.true(kar.indexOf(redir[0].request.url) !== -1, 'the original request url should be present')
  t.true(kar.indexOf(req[0].request.url) !== -1, 'the new request  url should be present')
  t.true(urlar.indexOf(redir[0].request.url) !== -1, 'the original request url should be present')
  t.true(urlar.indexOf(req[0].request.url) !== -1, 'the new request  url should be present')
  cr.addRequestInfo(req[0])
  t.is(cr._reqs.size, 3, 'captured request _reqs map should be of size 3 after adding a duplicate request')
})

test('CapturedRequest iterator should iterate over the request info', t => {
  const {context: {data: {redir, req}}} = t
  const cr = CapturedRequest.newOne(req[0])
  t.truthy(cr, 'the newly created captured request using new one should not be undefined or null')
  t.is(cr.requestId, req[0].requestId, 'captured request id should be the same as the request object used to create it')
  t.is(cr._reqs.size, 1, 'captured request _reqs map should be of size one')
  cr.addRequestInfo(req[1])
  cr.addRequestInfo(redir[0])
  cr.addRequestInfo(redir[1])
  cr.addRequestInfo(redir[2])
  t.is(cr._reqs.size, 3, 'captured request _reqs map should be of size 3')
  const iter = cr[Symbol.iterator]()
  const reqData = iter.next().value
  t.is(reqData.url, req[0].request.url, 'the first request info from the iterator should be about the request')
  const rerData = iter.next().value
  t.is(rerData.url, redir[0].request.url, 'the second request info from the iterator should be about the redirect')
  const rerData2 = iter.next().value
  t.is(rerData2.url, redir[2].response.url, 'the last request info from the iterator should be about the redirect')
  t.true(iter.next().done, 'the iterator should be done after three calls to next')
})
