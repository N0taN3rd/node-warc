import test from 'ava'
import uuid from 'uuid/v4'
import fs from 'fs-extra'
import { fakeResponse } from './helpers/filePaths'
import restore from './helpers/warcWriterBaseMonkeyPatches'
import {
  crlfRe,
  dateRe,
  parseWrittenRequestRecord,
  parseWrittenResponseRecord,
  parseWARCHeader,
  checkRecordId
} from './helpers/warcHelpers'
import { WARCV } from '../lib/writers/warcFields'
import WARCWriterBase from '../lib/writers/warcWriterBase'

const fakeReqResHttpData = {
  targetURI: 'http://stringjs.com/',
  reqData: {
    headers:
      'GET / HTTP/1.1\r\n' +
      'Host: stringjs.com\r\n' +
      'Connection: keep-alive\r\n' +
      'Upgrade-Insecure-Requests: 1\r\n' +
      'X-DevTools-Request-Id: 12704.1\r\n' +
      'User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Electron/1.7.4 Safari/537.36\r\n' +
      'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8\r\n' +
      'Accept-Encoding: gzip, deflate\r\n' +
      'Accept-Language: en-US\r\n',
    data: undefined
  },
  resData: {
    headers:
      'HTTP/1.1 200 OK\r\n' +
      'Server: GitHub.com\r\n' +
      'Date: Sun, 16 Jul 2017 05:31:28 GMT\r\n' +
      'Content-Type: text/html; charset=utf-8\r\n' +
      'Transfer-Encoding: chunked\r\n' +
      'Last-Modified: Mon, 22 Sep 2014 14:44:55 GMT\r\n' +
      'Access-Control-Allow-Origin: *\r\n' +
      'Expires: Sun, 16 Jul 2017 05:41:28 GMT\r\n' +
      'Cache-Control: max-age=600\r\n' +
      'X-GitHub-Request-Id: AE92:0456:5576F1:80DBF9:596AFA30\r\n'
  }
}

test.after.always(t => {
  restore()
})

test.beforeEach(t => {
  /**
   * @type {WARCWriterBase}
   */
  t.context.writer = new WARCWriterBase()
})

test.afterEach(t => {
  t.context.writer.removeAllListeners()
  if (t.context.writer._warcOutStream != null) {
    t.context.writer._warcOutStream.clearAll()
  }
  t.context.writer = null
})

test('WARCWriterBase should attach finish and error handlers to the write stream', t => {
  const { writer } = t.context
  writer.initWARC('dummy.warc')
  const checkingWOS = writer._warcOutStream
  t.is(
    checkingWOS.listenerCount('finish'),
    1,
    'The finish event for the write stream should have 1 handler'
  )
  t.truthy(
    checkingWOS.passedOnFinish,
    'The finish event handler should have been set on the write stream'
  )
  t.is(
    checkingWOS.passedOnFinish,
    writer._onFinish,
    'The finish event handler set on the write stream should be WARCWriterBase._onFinish'
  )
  t.is(
    checkingWOS.listenerCount('error'),
    1,
    'The error event for the write stream should have 1 handler'
  )
  t.truthy(
    checkingWOS.passedOnError,
    'The error event handler should have been set on the write stream'
  )
  t.is(
    checkingWOS.passedOnError,
    writer._onError,
    'The error event handler set on the write stream should be WARCWriterBase._onError'
  )
})

test('WARCWriterBase should emit the error event if the write stream emits an error', async t => {
  const { writer } = t.context
  writer.initWARC('dummy.warc')
  const checkingWOS = writer._warcOutStream
  const ep = new Promise(resolve => {
    writer.once('error', resolve)
  })
  checkingWOS.emitError('Hey some error happened')
  const emittedError = await ep
  t.is(emittedError.message, 'Hey some error happened')
})

test('WARCWriterBase should clean up after itself once the end method is called', async t => {
  const { writer } = t.context
  writer.initWARC('dummy.warc')
  const checkingWOS = writer._warcOutStream
  writer.end()
  t.true(
    checkingWOS.endCalled,
    'Once the end method of WARCWriterBase is called the end method of the write stream should be called'
  )
  const lastError = await new Promise((resolve, reject) => {
    const to = setTimeout(() => reject(new Error('timeout')), 5000)
    writer.once('finished', le => {
      clearTimeout(to)
      resolve(le)
    })
    checkingWOS.emitFinish()
  })
  t.falsy(
    lastError,
    'When no error occurs during the warc writting process, WARCWriterBase should not emit an error with the finish event'
  )
  t.true(
    checkingWOS.destroyCalled,
    'Once warc writting has ended the write stream should be destroyed'
  )
  t.true(
    checkingWOS.removeAllListenersCalled,
    'Once warc writting has ended the write stream should have all registered listeners removed'
  )
})

test('WARCWriterBase should wait for the drain event if the write function returns false', async t => {
  const { writer } = t.context
  writer.initWARC('dummy.warc')
  const checkingWOS = writer._warcOutStream
  checkingWOS.enableDrain()
  await Promise.all([
    writer.writeRecordChunks(Buffer.from([])),
    new Promise(resolve => {
      checkingWOS.emitDrain()
      resolve()
    })
  ])
  t.is(
    checkingWOS.onceListeners.length,
    1,
    'A once listener should have been added'
  )
  t.is(
    checkingWOS.onceListeners[0].event,
    'drain',
    'A once listener should have been attacked to the drain event'
  )
})

test('initWARC should only use the default options when no options or env variables are used', t => {
  const { writer } = t.context
  writer.initWARC('dummy.warc')
  const { path, options } = writer._warcOutStream
  t.is(
    path,
    'dummy.warc',
    'the path WARCWriterBase should have used is dummy.warc'
  )
  t.deepEqual(
    options,
    { encoding: 'utf8' },
    'WARCWriterBase should have used the default opts'
  )
  t.deepEqual(
    writer.opts,
    { appending: false, gzip: false },
    'WARCWriterBase when no options are supplied should not set appending or gzip to true'
  )
})

test('initWARC should init the warc in appending mode when the options state appending', t => {
  const { writer } = t.context
  writer.initWARC('dummy.warc', { appending: true })
  const { path, options } = writer._warcOutStream
  t.is(
    path,
    'dummy.warc',
    'the path WARCWriterBase should have used is dummy.warc'
  )
  t.deepEqual(
    options,
    { encoding: 'utf8', flags: 'a' },
    'WARCWriterBase should have used the default opts'
  )
  t.deepEqual(
    writer.opts,
    { appending: true, gzip: false },
    'WARCWriterBase when options are supplied (appending: true) should set appending to true but not gzip'
  )
})

test('initWARC should init the warc and be in gzip mode when the options state to gzip', t => {
  const { writer } = t.context
  writer.initWARC('dummy.warc', { gzip: true })
  const { path, options } = writer._warcOutStream
  t.is(
    path,
    'dummy.warc.gz',
    'the path WARCWriterBase should have used is dummy.warc'
  )
  t.deepEqual(
    options,
    { encoding: 'utf8' },
    'WARCWriterBase should have used the default opts'
  )
  t.deepEqual(
    writer.opts,
    { appending: false, gzip: true },
    'WARCWriterBase when options are supplied (gzip: true) should set gzip to true but not appending'
  )
})

test('writeRecordChunks should just write the buffer chunks', async t => {
  const { writer } = t.context
  writer.initWARC('dummy.warc')
  await writer.writeRecordChunks(
    Buffer.from([]),
    Buffer.from([]),
    Buffer.from([])
  )
  const checkingWOS = writer._warcOutStream
  t.is(
    checkingWOS.numWrites(),
    3,
    'WARCWriterBase should have only called writestream.write 3x'
  )
  t.true(
    checkingWOS.writeSequence.every(
      b => b.buffer.length === 0 && b.encoding === 'utf8'
    ),
    'No additional content should have been added'
  )
})

test('writeWarcInfoRecord should write a correct info record', async t => {
  const { writer } = t.context
  writer.initWARC('dummy.warc')
  await writer.writeWarcInfoRecord({
    isPartOf: 'testing',
    description: 'createdByTesting',
    'http-header-user-agent': 'superduper awesome browser'
  })
  const checkingWOS = writer._warcOutStream
  t.is(
    checkingWOS.numWrites(),
    1,
    'WARCWriterBase should have only called writestream.write once'
  )
  const { buffer, encoding } = checkingWOS.getAWrite()
  t.is(
    encoding,
    'utf8',
    'The encoding of the warc info record written should be utf8'
  )
  t.true(buffer != null, 'The buffer written should not be null')
  const bufferString = buffer.toString()
  t.is(
    (bufferString.match(crlfRe) || []).length,
    15,
    'The written record should only contain 15 CRLFs'
  )
  t.true(
    bufferString.endsWith('\r\n\r\n'),
    'The written record should end with 2 CRLFs'
  )
  const parsed = parseWARCHeader(bufferString)
  t.is(parsed['WARC'], WARCV, `The warc version should be ${WARCV}`)
  t.is(parsed['WARC-Type'], 'warcinfo', 'The warc type should be info')
  t.true(
    checkRecordId(parsed['WARC-Record-ID']),
    'something is wrong with the warc record id'
  )
  t.true(
    dateRe.test(parsed['WARC-Date']),
    'something is wrong with the warc date field'
  )
  t.is(
    parsed['Content-Length'],
    '159',
    'something is wrong with the headers field content-length'
  )
  t.is(
    parsed['WARC-Filename'],
    'dummy.warc',
    'the warc filename field should be dummy.warc'
  )
  t.is(parsed['isPartOf'], 'testing', 'isPartOf should be "testing"')
  t.is(
    parsed['description'],
    'createdByTesting',
    'description should be "createdByTesting"'
  )
  t.is(
    parsed['http-header-user-agent'],
    'superduper awesome browser',
    'http-header-user-agent should be "superduper awesome browser"'
  )
})

test('writeWarcRawInfoRecord should write a correct info record', async t => {
  const { writer } = t.context
  writer.initWARC('dummy.warc')
  await writer.writeWarcRawInfoRecord('')
  const checkingWOS = writer._warcOutStream
  t.is(
    checkingWOS.numWrites(),
    1,
    'WARCWriterBase should have only called writestream.write once'
  )
  const { buffer, encoding } = checkingWOS.getAWrite()
  t.is(
    encoding,
    'utf8',
    'The encoding of the warc info record written should be utf8'
  )
  t.true(buffer != null, 'The buffer written should not be null')
  const bufferString = buffer.toString()
  t.is(
    (bufferString.match(crlfRe) || []).length,
    10,
    'The written info record with empty content should only contain 9 CRLFs'
  )
  t.true(
    bufferString.endsWith('\r\n\r\n'),
    'The written record should end with 2 CRLFs'
  )
  const parsed = parseWARCHeader(bufferString)
  t.is(parsed['WARC'], WARCV, `The warc version should be ${WARCV}`)
  t.is(parsed['WARC-Type'], 'warcinfo', 'The warc type should be info')
  t.true(
    checkRecordId(parsed['WARC-Record-ID']),
    'something is wrong with the warc record id'
  )
  t.true(
    dateRe.test(parsed['WARC-Date']),
    'something is wrong with the warc date field'
  )
  t.is(
    parsed['Content-Length'],
    '0',
    'something is wrong with the headers field content-length'
  )
  t.is(
    parsed['WARC-Filename'],
    'dummy.warc',
    'the warc filename field should be dummy.warc'
  )
})

test('writeWarcMetadataOutlinks should write a correct metadata record when no warc info record was previously written', async t => {
  const { writer } = t.context
  writer.initWARC('dummy.warc')
  const turi = 'http://example.com'
  const outlinks = 'outlinks: https://example.cm\nhttps://bar.example.com'
  await writer.writeWarcMetadataOutlinks(turi, outlinks)
  const checkingWOS = writer._warcOutStream
  t.is(
    checkingWOS.numWrites(),
    1,
    'WARCWriterBase should have only called writestream.write once'
  )
  const { buffer, encoding } = checkingWOS.getAWrite()
  t.is(
    encoding,
    'utf8',
    'The encoding of the warc info record written should be utf8'
  )
  t.truthy(buffer, 'The buffer written should not be null')
  const bufferString = buffer.toString()
  const parsed = parseWARCHeader(bufferString)
  t.is(parsed['WARC'], WARCV, `The warc version should be ${WARCV}`)
  t.is(parsed['WARC-Type'], 'metadata', 'The warc type should be metadata')
  t.true(
    dateRe.test(parsed['WARC-Date']),
    'something is wrong with the warc date field'
  )
  t.is(
    parsed['Content-Length'],
    '52',
    'something is wrong with the headers field content-length'
  )
  t.true(
    checkRecordId(parsed['WARC-Record-ID']),
    'something is wrong with the warc record id'
  )
  t.is(
    parsed['Content-Type'],
    'application/warc-fields',
    'something is wrong with the headers field content-type'
  )
  t.is(
    parsed['outlinks'],
    outlinks.split(': ')[1],
    'something is wrong with the outlinks'
  )
})

test('writeWarcMetadataOutlinks should write a correct metadata record when a warc info record was previously written', async t => {
  const { writer } = t.context
  writer.initWARC('dummy.warc')
  const winfoId = uuid()
  writer._warcInfoId = winfoId
  const turi = 'http://example.com'
  const outlinks = 'outlinks: https://example.cm\nhttps://bar.example.com'
  await writer.writeWarcMetadataOutlinks(turi, outlinks)
  const checkingWOS = writer._warcOutStream
  t.is(
    checkingWOS.numWrites(),
    1,
    'WARCWriterBase should have only called writestream.write once'
  )
  const { buffer, encoding } = checkingWOS.getAWrite()
  t.is(
    encoding,
    'utf8',
    'The encoding of the warc info record written should be utf8'
  )
  t.truthy(buffer, 'The buffer written should not be null')
  const bufferString = buffer.toString()
  const parsed = parseWARCHeader(bufferString)
  t.is(parsed['WARC'], WARCV, `The warc version should be ${WARCV}`)
  t.is(parsed['WARC-Type'], 'metadata', 'The warc type should be info')
  t.true(
    checkRecordId(parsed['WARC-Record-ID']),
    'something is wrong with the warc record id'
  )
  t.true(
    dateRe.test(parsed['WARC-Date']),
    'something is wrong with the warc date field'
  )
  t.is(
    parsed['Content-Length'],
    '52',
    'something is wrong with the headers field content-length'
  )
  t.is(
    parsed['WARC-Concurrent-To'],
    `<urn:uuid:${winfoId}>`,
    'The WARC-Concurrent-To field should be equal to the warc info records id if one was previously written exists'
  )
  t.is(
    parsed['Content-Type'],
    'application/warc-fields',
    'something is wrong with the headers field content-type'
  )
  t.is(
    parsed['outlinks'],
    outlinks.split(': ')[1],
    'something is wrong with the outlinks'
  )
})

test('writeWarcMetadata should write a correct metadata record when no warc info record was previously written', async t => {
  const { writer } = t.context
  writer.initWARC('dummy.warc')
  const turi = 'http://example.com'
  const outlinks = 'outlinks: https://example.cm\nhttps://bar.example.com'
  await writer.writeWarcMetadata(turi, outlinks)
  const checkingWOS = writer._warcOutStream
  t.is(
    checkingWOS.numWrites(),
    1,
    'WARCWriterBase should have only called writestream.write once'
  )
  const { buffer, encoding } = checkingWOS.getAWrite()
  t.is(
    encoding,
    'utf8',
    'The encoding of the warc info record written should be utf8'
  )
  t.truthy(buffer, 'The buffer written should not be null')
  const bufferString = buffer.toString()
  const parsed = parseWARCHeader(bufferString)
  t.is(parsed['WARC'], WARCV, `The warc version should be ${WARCV}`)
  t.is(parsed['WARC-Type'], 'metadata', 'The warc type should be metadata')
  t.true(
    dateRe.test(parsed['WARC-Date']),
    'something is wrong with the warc date field'
  )
  t.is(
    parsed['Content-Length'],
    '52',
    'something is wrong with the headers field content-length'
  )
  t.true(
    checkRecordId(parsed['WARC-Record-ID']),
    'something is wrong with the warc record id'
  )
  t.is(
    parsed['Content-Type'],
    'application/warc-fields',
    'something is wrong with the headers field content-type'
  )
  t.is(
    parsed['outlinks'],
    outlinks.split(': ')[1],
    'something is wrong with the outlinks'
  )
})

test('writeWarcMetadata should write a correct metadata record when a warc info record was previously written', async t => {
  const { writer } = t.context
  writer.initWARC('dummy.warc')
  const winfoId = uuid()
  writer._warcInfoId = winfoId
  const turi = 'http://example.com'
  const outlinks = 'outlinks: https://example.cm\nhttps://bar.example.com'
  await writer.writeWarcMetadata(turi, outlinks)
  const checkingWOS = writer._warcOutStream
  t.is(
    checkingWOS.numWrites(),
    1,
    'WARCWriterBase should have only called writestream.write once'
  )
  const { buffer, encoding } = checkingWOS.getAWrite()
  t.is(
    encoding,
    'utf8',
    'The encoding of the warc info record written should be utf8'
  )
  t.truthy(buffer, 'The buffer written should not be null')
  const bufferString = buffer.toString()
  const parsed = parseWARCHeader(bufferString)
  t.is(parsed['WARC'], WARCV, `The warc version should be ${WARCV}`)
  t.is(parsed['WARC-Type'], 'metadata', 'The warc type should be info')
  t.true(
    checkRecordId(parsed['WARC-Record-ID']),
    'something is wrong with the warc record id'
  )
  t.true(
    dateRe.test(parsed['WARC-Date']),
    'something is wrong with the warc date field'
  )
  t.is(
    parsed['Content-Length'],
    '52',
    'something is wrong with the headers field content-length'
  )
  t.is(
    parsed['WARC-Concurrent-To'],
    `<urn:uuid:${winfoId}>`,
    'The WARC-Concurrent-To field should be equal to the warc info records id if one was previously written exists'
  )
  t.is(
    parsed['Content-Type'],
    'application/warc-fields',
    'something is wrong with the headers field content-type'
  )
  t.is(
    parsed['outlinks'],
    outlinks.split(': ')[1],
    'something is wrong with the outlinks'
  )
})

test('writeRequestResponseRecords should write correct request and response records when no warc info record was previously written', async t => {
  const resData = await fs.readFile(fakeResponse, 'utf8')
  const { writer } = t.context
  writer.initWARC('dummy.warc')
  await writer.writeRequestResponseRecords(
    fakeReqResHttpData.targetURI,
    fakeReqResHttpData.reqData,
    { ...fakeReqResHttpData.resData, data: resData }
  )
  const checkingWOS = writer._warcOutStream
  t.is(
    checkingWOS.numWrites(),
    2,
    'WARCWriterBase should have only called writestream.write twice'
  )
  const reqBuffer = checkingWOS.getAWrite()
  t.is(
    reqBuffer.encoding,
    'utf8',
    'The encoding of the warc info record written should be utf8'
  )
  t.truthy(
    reqBuffer.buffer,
    'The request record buffer written should not be null'
  )
  const reqBufferStr = reqBuffer.buffer.toString()
  t.is(
    (reqBufferStr.match(crlfRe) || []).length,
    20,
    'The written request record should only contain 20 CRLFs'
  )
  t.true(
    reqBufferStr.endsWith('\r\n\r\n'),
    'The written record should end with 2 CRLFs'
  )
  const parsed = parseWrittenRequestRecord(reqBufferStr)
  t.is(parsed['WARC'], WARCV, `The warc version should be ${WARCV}`)
  t.is(parsed['WARC-Type'], 'request', 'The warc type should be request')
  t.true(
    checkRecordId(parsed['WARC-Record-ID']),
    'something is wrong with the warc record id'
  )
  t.true(
    dateRe.test(parsed['WARC-Date']),
    'something is wrong with the warc date field'
  )
  t.is(
    parsed['Content-Length'],
    '396',
    'something is wrong with the headers field content-length'
  )
  t.is(
    parsed['Content-Type'],
    'application/http; msgtype=request',
    'Something is wrong with the warc content type'
  )
  t.is(
    parsed['WARC-Target-URI'],
    fakeReqResHttpData.targetURI,
    'WARC-Target-URI for the request record should match the supplied target URI'
  )
  t.is(parsed.http, fakeReqResHttpData.reqData.headers)
  const resBuffer = checkingWOS.getAWrite()
  t.is(
    resBuffer.encoding,
    'utf8',
    'The encoding of the warc info record written should be utf8'
  )
  t.truthy(
    resBuffer.buffer,
    'The response record buffer written should not be null'
  )
  const resBufferStr = resBuffer.buffer.toString()
  t.is(
    (resBufferStr.match(crlfRe) || []).length,
    21,
    'The written record should only contain 21 CRLFs'
  )
  t.true(
    resBufferStr.endsWith('\r\n\r\n'),
    'The written record should end with 2 CRLFs'
  )
  const parsed2 = parseWrittenResponseRecord(resBufferStr)
  t.is(parsed2['WARC'], WARCV, `The warc version should be ${WARCV}`)
  t.is(parsed2['WARC-Type'], 'response', 'The warc type should be request')
  t.true(
    checkRecordId(parsed2['WARC-Record-ID']),
    'something is wrong with the warc record id'
  )
  t.true(
    dateRe.test(parsed2['WARC-Date']),
    'something is wrong with the warc date field'
  )
  t.is(
    parsed2['Content-Length'],
    '69645',
    'something is wrong with the headers field content-length'
  )
  t.is(
    parsed2['Content-Type'],
    'application/http; msgtype=response',
    'Something is wrong with the warc content type'
  )
  t.is(
    parsed2['WARC-Target-URI'],
    fakeReqResHttpData.targetURI,
    'WARC-Target-URI for the request record should match the supplied target URI'
  )
  t.is(parsed2.http, fakeReqResHttpData.resData.headers)
  t.is(parsed2.body, resData)
})

test('writeRequestResponseRecords should write correct request and response records when a warc info record was previously written', async t => {
  const resData = await fs.readFile(fakeResponse, 'utf8')
  const { writer } = t.context
  writer.initWARC('dummy.warc')
  const winfoId = uuid()
  writer._warcInfoId = winfoId
  await writer.writeRequestResponseRecords(
    fakeReqResHttpData.targetURI,
    fakeReqResHttpData.reqData,
    { ...fakeReqResHttpData.resData, data: resData }
  )
  const checkingWOS = writer._warcOutStream
  t.is(
    checkingWOS.numWrites(),
    2,
    'WARCWriterBase should have only called writestream.write twice'
  )
  const reqBuffer = checkingWOS.getAWrite()
  t.is(
    reqBuffer.encoding,
    'utf8',
    'The encoding of the warc info record written should be utf8'
  )
  t.truthy(
    reqBuffer.buffer,
    'The request record buffer written should not be null'
  )
  const reqBufferStr = reqBuffer.buffer.toString()
  t.is(
    (reqBufferStr.match(crlfRe) || []).length,
    21,
    'The written request record should only contain 21 CRLFs'
  )
  t.true(
    reqBufferStr.endsWith('\r\n\r\n'),
    'The written record should end with 2 CRLFs'
  )
  const parsed = parseWrittenRequestRecord(reqBufferStr)
  t.is(parsed['WARC'], WARCV, `The warc version should be ${WARCV}`)
  t.is(parsed['WARC-Type'], 'request', 'The warc type should be request')
  t.true(
    checkRecordId(parsed['WARC-Record-ID']),
    'something is wrong with the warc record id'
  )
  t.true(
    dateRe.test(parsed['WARC-Date']),
    'something is wrong with the warc date field'
  )
  t.is(
    parsed['Content-Length'],
    '396',
    'something is wrong with the headers field content-length'
  )
  t.is(
    parsed['Content-Type'],
    'application/http; msgtype=request',
    'Something is wrong with the warc content type'
  )
  t.is(
    parsed['WARC-Target-URI'],
    fakeReqResHttpData.targetURI,
    'WARC-Target-URI for the request record should match the supplied target URI'
  )
  t.true(
    checkRecordId(parsed['WARC-Warcinfo-ID']),
    'something is wrong with the requests WARC-Warcinfo-ID'
  )
  t.is(
    parsed['WARC-Warcinfo-ID'],
    `<urn:uuid:${winfoId}>`,
    'The WARC-Warcinfo-ID field of the request record should be equal to the warc info records id if one was previously written exists'
  )
  t.is(parsed.http, fakeReqResHttpData.reqData.headers)
  const resBuffer = checkingWOS.getAWrite()
  t.is(
    resBuffer.encoding,
    'utf8',
    'The encoding of the warc info record written should be utf8'
  )
  t.truthy(
    resBuffer.buffer,
    'The response record buffer written should not be null'
  )
  const resBufferStr = resBuffer.buffer.toString()
  t.is(
    (resBufferStr.match(crlfRe) || []).length,
    22,
    'The written response record should only contain 22 CRLFs'
  )
  t.true(
    resBufferStr.endsWith('\r\n\r\n'),
    'The written record should end with 2 CRLFs'
  )
  const parsed2 = parseWrittenResponseRecord(resBufferStr)
  t.is(
    parsed['WARC-Concurrent-To'],
    parsed2['WARC-Record-ID'],
    'the request record should be concurrent to the response records id'
  )
  t.true(
    checkRecordId(parsed['WARC-Concurrent-To']),
    'something is wrong with the requests WARC-Concurrent-To'
  )
  t.is(parsed2['WARC'], WARCV, `The warc version should be ${WARCV}`)
  t.is(parsed2['WARC-Type'], 'response', 'The warc type should be request')
  t.true(
    checkRecordId(parsed2['WARC-Record-ID']),
    'something is wrong with the warc record id'
  )
  t.true(
    dateRe.test(parsed2['WARC-Date']),
    'something is wrong with the warc date field'
  )
  t.is(
    parsed2['Content-Length'],
    '69645',
    'something is wrong with the headers field content-length'
  )
  t.is(
    parsed2['Content-Type'],
    'application/http; msgtype=response',
    'Something is wrong with the warc content type'
  )
  t.is(
    parsed2['WARC-Target-URI'],
    fakeReqResHttpData.targetURI,
    'WARC-Target-URI for the request record should match the supplied target URI'
  )
  t.is(
    parsed2['WARC-Target-URI'],
    fakeReqResHttpData.targetURI,
    'WARC-Target-URI for the request record should match the supplied target URI'
  )
  t.is(
    parsed2['WARC-Warcinfo-ID'],
    `<urn:uuid:${winfoId}>`,
    'The WARC-Warcinfo-ID field of the response record should be equal to the warc info records id if one was previously written exists'
  )
  t.true(
    checkRecordId(parsed2['WARC-Warcinfo-ID']),
    'something is wrong with the responses WARC-Warcinfo-ID'
  )
  t.is(parsed2.http, fakeReqResHttpData.resData.headers)
  t.is(parsed2.body, resData)
})

test('writeRequestRecord should write correct request when no warc info record was previously written', async t => {
  const { writer } = t.context
  writer.initWARC('dummy.warc')
  await writer.writeRequestRecord(
    fakeReqResHttpData.targetURI,
    fakeReqResHttpData.reqData.headers,
    fakeReqResHttpData.reqData.data
  )
  const checkingWOS = writer._warcOutStream
  t.is(
    checkingWOS.numWrites(),
    1,
    'WARCWriterBase should have only called writestream.write twice'
  )
  const reqBuffer = checkingWOS.getAWrite()
  t.is(
    reqBuffer.encoding,
    'utf8',
    'The encoding of the warc info record written should be utf8'
  )
  t.truthy(
    reqBuffer.buffer,
    'The request record buffer written should not be null'
  )
  const reqBufferStr = reqBuffer.buffer.toString()
  t.is(
    (reqBufferStr.match(crlfRe) || []).length,
    19,
    'The written request record should only contain 19 CRLFs'
  )
  t.true(
    reqBufferStr.endsWith('\r\n\r\n'),
    'The written record should end with 2 CRLFs'
  )
  const parsed = parseWrittenRequestRecord(reqBufferStr)
  t.is(parsed['WARC'], WARCV, `The warc version should be ${WARCV}`)
  t.is(parsed['WARC-Type'], 'request', 'The warc type should be request')
  t.true(
    checkRecordId(parsed['WARC-Record-ID']),
    'something is wrong with the warc record id'
  )
  t.true(
    dateRe.test(parsed['WARC-Date']),
    'something is wrong with the warc date field'
  )
  t.is(
    parsed['Content-Length'],
    '396',
    'something is wrong with the headers field content-length'
  )
  t.is(
    parsed['Content-Type'],
    'application/http; msgtype=request',
    'Something is wrong with the warc content type'
  )
  t.is(
    parsed['WARC-Target-URI'],
    fakeReqResHttpData.targetURI,
    'WARC-Target-URI for the request record should match the supplied target URI'
  )
  t.is(parsed.http, fakeReqResHttpData.reqData.headers)
})

test('writeRequestRecord should write correct request when a warc info record was previously written', async t => {
  const { writer } = t.context
  writer.initWARC('dummy.warc')
  const winfoId = uuid()
  writer._warcInfoId = winfoId
  await writer.writeRequestRecord(
    fakeReqResHttpData.targetURI,
    fakeReqResHttpData.reqData.headers,
    fakeReqResHttpData.reqData.data
  )
  const checkingWOS = writer._warcOutStream
  t.is(
    checkingWOS.numWrites(),
    1,
    'WARCWriterBase should have only called writestream.write twice'
  )
  const reqBuffer = checkingWOS.getAWrite()
  t.is(
    reqBuffer.encoding,
    'utf8',
    'The encoding of the warc info record written should be utf8'
  )
  t.truthy(
    reqBuffer.buffer,
    'The request record buffer written should not be null'
  )
  const reqBufferStr = reqBuffer.buffer.toString()
  t.is(
    (reqBufferStr.match(crlfRe) || []).length,
    20,
    'The written request record should only contain 20 CRLFs'
  )
  t.true(
    reqBufferStr.endsWith('\r\n\r\n'),
    'The written record should end with 2 CRLFs'
  )
  const parsed = parseWrittenRequestRecord(reqBufferStr)
  t.is(parsed['WARC'], WARCV, `The warc version should be ${WARCV}`)
  t.is(parsed['WARC-Type'], 'request', 'The warc type should be request')
  t.true(
    checkRecordId(parsed['WARC-Record-ID']),
    'something is wrong with the warc record id'
  )
  t.true(
    dateRe.test(parsed['WARC-Date']),
    'something is wrong with the warc date field'
  )
  t.is(
    parsed['Content-Length'],
    '396',
    'something is wrong with the headers field content-length'
  )
  t.is(
    parsed['Content-Type'],
    'application/http; msgtype=request',
    'Something is wrong with the warc content type'
  )
  t.is(
    parsed['WARC-Target-URI'],
    fakeReqResHttpData.targetURI,
    'WARC-Target-URI for the request record should match the supplied target URI'
  )
  t.is(
    parsed['WARC-Warcinfo-ID'],
    `<urn:uuid:${winfoId}>`,
    'The WARC-Warcinfo-ID field of the request record should be equal to the warc info records id if one was previously written exists'
  )
  t.is(parsed.http, fakeReqResHttpData.reqData.headers)
})

test('writeResponseRecord should write correct response when no warc info record was previously written', async t => {
  const resData = await fs.readFile(fakeResponse, 'utf8')
  const { writer } = t.context
  writer.initWARC('dummy.warc')
  await writer.writeResponseRecord(
    fakeReqResHttpData.targetURI,
    fakeReqResHttpData.resData.headers,
    resData
  )
  const checkingWOS = writer._warcOutStream
  t.is(
    checkingWOS.numWrites(),
    1,
    'WARCWriterBase should have only called writestream.write twice'
  )
  const resBuffer = checkingWOS.getAWrite()
  t.is(
    resBuffer.encoding,
    'utf8',
    'The encoding of the warc info record written should be utf8'
  )
  t.truthy(
    resBuffer.buffer,
    'The response record buffer written should not be null'
  )
  const resBufferStr = resBuffer.buffer.toString()
  t.is(
    (resBufferStr.match(crlfRe) || []).length,
    21,
    'The written record should only contain 21 CRLFs'
  )
  t.true(
    resBufferStr.endsWith('\r\n\r\n'),
    'The written record should end with 2 CRLFs'
  )
  const parsed2 = parseWrittenResponseRecord(resBufferStr)
  t.is(parsed2['WARC'], WARCV, `The warc version should be ${WARCV}`)
  t.is(parsed2['WARC-Type'], 'response', 'The warc type should be request')
  t.true(
    checkRecordId(parsed2['WARC-Record-ID']),
    'something is wrong with the warc record id'
  )
  t.true(
    dateRe.test(parsed2['WARC-Date']),
    'something is wrong with the warc date field'
  )
  t.is(
    parsed2['Content-Length'],
    '69645',
    'something is wrong with the headers field content-length'
  )
  t.is(
    parsed2['Content-Type'],
    'application/http; msgtype=response',
    'Something is wrong with the warc content type'
  )
  t.is(
    parsed2['WARC-Target-URI'],
    fakeReqResHttpData.targetURI,
    'WARC-Target-URI for the request record should match the supplied target URI'
  )
  t.is(parsed2.http, fakeReqResHttpData.resData.headers)
  t.is(parsed2.body, resData)
})

test('writeResponseRecord should write correct response when a warc info record was previously written', async t => {
  const resData = await fs.readFile(fakeResponse, 'utf8')
  const { writer } = t.context
  writer.initWARC('dummy.warc')
  const winfoId = uuid()
  writer._warcInfoId = winfoId
  await writer.writeResponseRecord(
    fakeReqResHttpData.targetURI,
    fakeReqResHttpData.resData.headers,
    resData
  )
  const checkingWOS = writer._warcOutStream
  t.is(
    checkingWOS.numWrites(),
    1,
    'WARCWriterBase should have only called writestream.write twice'
  )
  const resBuffer = checkingWOS.getAWrite()
  t.is(
    resBuffer.encoding,
    'utf8',
    'The encoding of the warc info record written should be utf8'
  )
  t.truthy(
    resBuffer.buffer,
    'The response record buffer written should not be null'
  )
  const resBufferStr = resBuffer.buffer.toString()
  t.is(
    (resBufferStr.match(crlfRe) || []).length,
    22,
    'The written response record should only contain 22 CRLFs'
  )
  t.true(
    resBufferStr.endsWith('\r\n\r\n'),
    'The written record should end with 2 CRLFs'
  )
  const parsed2 = parseWrittenResponseRecord(resBufferStr)
  t.is(parsed2['WARC'], WARCV, `The warc version should be ${WARCV}`)
  t.is(parsed2['WARC-Type'], 'response', 'The warc type should be request')
  t.true(
    checkRecordId(parsed2['WARC-Record-ID']),
    'something is wrong with the warc record id'
  )
  t.true(
    dateRe.test(parsed2['WARC-Date']),
    'something is wrong with the warc date field'
  )
  t.is(
    parsed2['Content-Length'],
    '69645',
    'something is wrong with the headers field content-length'
  )
  t.is(
    parsed2['Content-Type'],
    'application/http; msgtype=response',
    'Something is wrong with the warc content type'
  )
  t.is(
    parsed2['WARC-Target-URI'],
    fakeReqResHttpData.targetURI,
    'WARC-Target-URI for the request record should match the supplied target URI'
  )
  t.is(
    parsed2['WARC-Target-URI'],
    fakeReqResHttpData.targetURI,
    'WARC-Target-URI for the request record should match the supplied target URI'
  )
  t.true(
    checkRecordId(parsed2['WARC-Warcinfo-ID']),
    'something is wrong with the responses WARC-Warcinfo-ID'
  )
  t.is(
    parsed2['WARC-Warcinfo-ID'],
    `<urn:uuid:${winfoId}>`,
    'The WARC-Warcinfo-ID field of the response record should be equal to the warc info records id if one was previously written exists'
  )
  t.is(parsed2.http, fakeReqResHttpData.resData.headers)
  t.is(parsed2.body, resData)
})

test('writeRecordBlock should just write the buffer', async t => {
  const { writer } = t.context
  writer.initWARC('dummy.warc')
  await writer.writeRecordBlock(Buffer.from([]))
  const checkingWOS = writer._warcOutStream
  t.is(
    checkingWOS.numWrites(),
    1,
    'WARCWriterBase should have only called writestream.write 1x'
  )
  t.true(
    checkingWOS.writeSequence.every(
      b => b.buffer.length === 0 && b.encoding === 'utf8'
    ),
    'No additional content should have been added'
  )
})

test('writeRecordBlock should just gzip the buffer if gzip is enabled', async t => {
  const { writer } = t.context
  writer.initWARC('dummy.warc', { gzip: true })
  const ungzipped = Buffer.from('Please gzip me', 'utf8')
  await writer.writeRecordBlock(ungzipped)
  const checkingWOS = writer._warcOutStream
  const proxiedZlib = require('zlib')
  t.is(proxiedZlib.gzipSyncCallCount, 1)
  const { buffer } = checkingWOS.getAWrite()
  const ungzWrittenBuffer = proxiedZlib.gunzipSync(buffer)
  t.true(
    ungzWrittenBuffer.equals(ungzipped),
    'When ungzipped the gzipped buffers contents should equal the original buffers contents'
  )
})
