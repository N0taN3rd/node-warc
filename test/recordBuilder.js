import test from 'ava'
import WARCRecorderBuilder from '../lib/warcRecordBuilder'
import warcRecords from '../lib/warcRecords'
import buildKeys from '../lib/warcRecordBuilder/buildKeys'

test.beforeEach(t => {
  t.context.builder = new WARCRecorderBuilder()
})

test('WARCRecorderBuilder.determineWarcType should return the correct build key', t => {
  const {context: {builder}} = t
  const empty = Buffer.from('')
  const begin = Buffer.from('WARC/1.0\r')
  const warcInfo = Buffer.from('WARC-Type: warcinfo\r')
  const warcMetaData = Buffer.from('WARC-Type: metadata\r')
  const warcRequest = Buffer.from('WARC-Type: request\r')
  const warcResponse = Buffer.from('WARC-Type: response\r')
  const warcRevisit = Buffer.from('WARC-Type: revisit\r')
  const warcResource = Buffer.from('WARC-Type: resource\r')
  t.is(builder.determineWarcType(warcInfo, empty), buildKeys.builderKeyInfo, 'The build key for warcinfo record should be builderKeyInfo')
  t.is(builder.determineWarcType(warcMetaData, empty), buildKeys.builderKeyMdata, 'The build key for metadata record should be builderKeyMdata')
  t.is(builder.determineWarcType(warcRequest, empty), buildKeys.builderKeyReq, 'The build key for request record should be builderKeyReq')
  t.is(builder.determineWarcType(warcResponse, empty), buildKeys.builderKeyRes, 'The build key for response record should be builderKeyRes')
  t.is(builder.determineWarcType(warcRevisit, empty), buildKeys.builderKeyRev, 'The build key for revisit record should be builderKeyRev')
  t.is(builder.determineWarcType(warcResource, empty), buildKeys.builderKeyResource, 'The build key for resource record should be builderKeyResource')
  t.is(builder.determineWarcType(begin, empty), buildKeys.builderKeyUnknown, 'The build key for an unknown record should be builderKeyUnknown')
})

test('WARCRecorderBuilder should correctly build a info record', t => {
  const {context: {builder}} = t
  const type = Buffer.from('WARC-Type: warcinfo\r')
  const begin = Buffer.from('WARC/1.0\r')
  const key = builder.determineWarcType(type, begin)
  const header = [
    'WARC-Filename: dummy.warc',
    'WARC-Date: 2017-07-16T05:31:34Z',
    'WARC-Record-ID: <urn:uuid:07e1fef0-69e8-11e7-b852-0da77bcdf4dd>',
    'Content-Type: application/warc-fields',
    'Content-Length: 3064'
  ]
  t.is(key, buildKeys.builderKeyInfo, 'The build key be  builderKeyInfo')
  t.truthy(builder._info, 'the info map should not be null')
  t.is(builder._info.get('header').length, 2, 'the header array should be 2 after determineWarcType')
  header.forEach(it => {
    builder.addLineTo(key, 0, Buffer.from(it))
  })
  const body = [
    'software: crummySoftware',
    'format: WARC File Format 1.0',
    'conformsTo: http://bibnum.bnf.fr/WARC/WARC_ISO_28500_version1_latestdraft.pdf',
    'isPartOf: xyz',
    'description: Archived by none for xyz',
    'robots: ignore',
    'http-header-user-agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Electron/1.7.4 Safari/537.36'
  ]
  body.forEach(it => {
    builder.addLineTo(key, 1, Buffer.from(it))
  })
  const builtRecord = builder.buildRecord(key)
  t.truthy(builtRecord, 'the record built should not be null or undefined')
  t.is(builtRecord.type, 'warcinfo', 'the type property of the record built should be info')
  t.is(builtRecord.warcType, 'warcinfo', 'the type property of the record built should be info')
  t.true(builtRecord instanceof warcRecords.WARCInfoRecord, 'the record returned should be an instance of WARCInfoRecord')
  t.truthy(builtRecord.warcHeader, 'the warcHeader property of the built record should be defined')
  header.forEach(it => {
    let [k, v] = it.split(': ')
    switch (k) {
      case 'WARC-Target-URI':
        t.is(builtRecord.targetURI, v, 'the targetURI getter should return the targetURI')
        break
      case 'WARC-Filename':
        t.is(builtRecord.warcFilename, v, 'the warcFilename getter for the record should return the warcs filename')
        break
      case 'WARC-Record-ID':
        v = v.replace('<urn:uuid:', '').replace('>', '')
        t.is(builtRecord.recordId, v, 'the recordId getter for the record should return the record id')
        break
      case 'Content-Type':
        t.is(builtRecord.warcContentType, v, 'the warc content type getter should return the warc content type')
        break
      case 'WARC-Concurrent-To':
        v = v.replace('<urn:uuid:', '').replace('>', '')
        t.is(builtRecord.concurrentTo, v, 'the concurrent to getter should return the concurrent to id')
        break
      case 'Content-Length':
        v = Number(v)
        t.is(builtRecord.warcContentLength, v, 'the warc content length getter should return the warc content length')
        break
    }
    t.true(k in builtRecord.warcHeader, `the warc header key[${k}] supplied should be in the warcHeader`)
    t.true(v === builtRecord.warcHeader[k], `the value for the warc header key[${k}] should be the one supplied`)
  })
  t.truthy(builtRecord.content, 'the content property  should not be null')
  body.forEach(it => {
    let [k, v] = it.split(': ')
    t.true(k in builtRecord.content, `the content object should have the key[${k}]`)
    t.true(v === builtRecord.content[k], `the value of the key[${k}] for the content object should be the one supplied`)
  })
})

test('WARCRecorderBuilder should correctly build a info record if the record is indeed a info record but the build key is unknown', t => {
  const {context: {builder}} = t
  const type = Buffer.from('WARC-Filename: dummy.warc\r')
  const begin = Buffer.from('WARC/1.0\r')
  const key = builder.determineWarcType(type, begin)
  const header = [
    'WARC-Type: warcinfo\r',
    'WARC-Date: 2017-07-16T05:31:34Z\r',
    'WARC-Record-ID: <urn:uuid:07e1fef0-69e8-11e7-b852-0da77bcdf4dd>',
    'Content-Type: application/warc-fields',
    'Content-Length: 3064'
  ]
  t.is(key, buildKeys.builderKeyUnknown, 'The build key should be builderKeyUnknown')
  header.forEach(it => {
    builder.addLineTo(key, 0, Buffer.from(it))
  })
  const body = [
    'software: crummySoftware',
    'format: WARC File Format 1.0',
    'conformsTo: http://bibnum.bnf.fr/WARC/WARC_ISO_28500_version1_latestdraft.pdf',
    'isPartOf: xyz',
    'description: Archived by none for xyz',
    'robots: ignore',
    'http-header-user-agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Electron/1.7.4 Safari/537.36'
  ]
  body.forEach(it => {
    builder.addLineTo(key, 1, Buffer.from(it))
  })
  const builtRecord = builder.buildRecord(key)
  t.truthy(builtRecord, 'the record built should not be null or undefined')
  t.is(builtRecord.type, 'warcinfo', 'the type property of the record built should be info')
  t.is(builtRecord.warcType, 'warcinfo', 'the type property of the record built should be info')
  t.true(builtRecord instanceof warcRecords.WARCInfoRecord, 'the record returned should be an instance of WARCInfoRecord')
  t.truthy(builtRecord.warcHeader, 'the warcHeader property of the built record should be defined')
})

test('WARCRecorderBuilder should correctly build a metadata record', t => {
  const {context: {builder}} = t
  const type = Buffer.from('WARC-Type: metadata\r')
  const begin = Buffer.from('WARC/1.0\r')
  const key = builder.determineWarcType(type, begin)
  const header = [
    'WARC-Target-URI: http://stringjs.com/',
    'WARC-Date: 2017-07-16T05:31:34Z',
    'WARC-Concurrent-To: <urn:uuid:07e1fef0-69e8-11e7-b852-0da77bcdf4dd>',
    'WARC-Record-ID: <urn:uuid:07e1fef0-69e8-11e7-b852-0da77bcdf4dd>',
    'Content-Type: application/warc-fields',
    'Content-Length: 3064'
  ]
  t.is(key, buildKeys.builderKeyMdata, 'The build key be builderKeyMdata')
  t.truthy(builder._mdata, 'the info map should not be null')
  t.is(builder._mdata.get('header').length, 2, 'the header array should be 2 after determineWarcType')
  header.forEach(it => {
    builder.addLineTo(key, 0, Buffer.from(it))
  })
  const body = [
    'https://s3.amazonaws.com/github/ribbons/forkme_right_darkblue_121621.png E =EMBED_MISC',
    'https://secure.travis-ci.org/jprichardson/string.js.png E =EMBED_MISC',
    'http://documentup.com/stylesheets/screen.css E link/@href',
    'http://use.typekit.net/hjp0pft.js E script/@src'
  ]
  body.forEach(it => {
    builder.addLineTo(key, 1, Buffer.from(it))
  })
  const builtRecord = builder.buildRecord(key)
  t.truthy(builtRecord, 'the record built should not be null or undefined')
  t.is(builtRecord.type, 'metadata', 'the type property of the record built should be info')
  t.is(builtRecord.warcType, 'metadata', 'the type property of the record built should be info')
  t.true(builtRecord instanceof warcRecords.WARCMetaDataRecord, 'the record returned should be an instance of WARCInfoRecord')
  t.truthy(builtRecord.warcHeader, 'the warcHeader property of the built record should be defined')
  header.forEach(it => {
    let [k, v] = it.split(': ')
    switch (k) {
      case 'WARC-Target-URI':
        t.is(builtRecord.targetURI, v, 'the targetURI getter should return the targetURI')
        break
      case 'WARC-Filename':
        t.is(builtRecord.warcFilename, v, 'the warcFilename getter for the record should return the warcs filename')
        break
      case 'WARC-Record-ID':
        v = v.replace('<urn:uuid:', '').replace('>', '')
        t.is(builtRecord.recordId, v, 'the recordId getter for the record should return the record id')
        break
      case 'Content-Type':
        t.is(builtRecord.warcContentType, v, 'the warc content type getter should return the warc content type')
        break
      case 'WARC-Concurrent-To':
        v = v.replace('<urn:uuid:', '').replace('>', '')
        t.is(builtRecord.concurrentTo, v, 'the concurrent to getter should return the concurrent to id')
        break
      case 'Content-Length':
        v = Number(v)
        t.is(builtRecord.warcContentLength, v, 'the warc content length getter should return the warc content length')
        break
    }
    t.true(k in builtRecord.warcHeader, `the warc header key[${k}] supplied should be in the warcHeader`)
    t.true(v === builtRecord.warcHeader[k], `the value for the warc header key[${k}] should be the one supplied`)
  })
  t.truthy(builtRecord.content, 'the content property  should not be null')
})

test('WARCRecorderBuilder should correctly build a metadata record if the record is indeed a metadata record but the build key is unknown', t => {
  const {context: {builder}} = t
  const type = Buffer.from('WARC-Target-URI: http://stringjs.com/\r')
  const begin = Buffer.from('WARC/1.0\r')
  const key = builder.determineWarcType(type, begin)
  const header = [
    'WARC-Type: metadata\r',
    'WARC-Date: 2017-07-16T05:31:34Z',
    'WARC-Concurrent-To: <urn:uuid:07e1fef0-69e8-11e7-b852-0da77bcdf4dd>',
    'WARC-Record-ID: <urn:uuid:07e1fef0-69e8-11e7-b852-0da77bcdf4dd>',
    'Content-Type: application/warc-fields',
    'Content-Length: 3064'
  ]
  t.is(key, buildKeys.builderKeyUnknown, 'The build key should be builderKeyUnknown')
  header.forEach(it => {
    builder.addLineTo(key, 0, Buffer.from(it))
  })
  const body = [
    'https://s3.amazonaws.com/github/ribbons/forkme_right_darkblue_121621.png E =EMBED_MISC',
    'https://secure.travis-ci.org/jprichardson/string.js.png E =EMBED_MISC',
    'http://documentup.com/stylesheets/screen.css E link/@href',
    'http://use.typekit.net/hjp0pft.js E script/@src'
  ]
  body.forEach(it => {
    builder.addLineTo(key, 1, Buffer.from(it))
  })
  const builtRecord = builder.buildRecord(key)
  t.truthy(builtRecord, 'the record built should not be null or undefined')
  t.is(builtRecord.type, 'metadata', 'the type property of the record built should be metadata')
  t.is(builtRecord.warcType, 'metadata', 'the type property of the record built should be metadata')
  t.true(builtRecord instanceof warcRecords.WARCMetaDataRecord, 'the record returned should be an instance of WARCMetaDataRecord')
})

test('WARCRecorderBuilder should correctly build a request record', t => {
  const {context: {builder}} = t
  const type = Buffer.from('WARC-Type: request\r')
  const begin = Buffer.from('WARC/1.0\r')
  const key = builder.determineWarcType(type, begin)
  const header = [
    'WARC-Target-URI: http://stringjs.com/',
    'WARC-Date: 2017-07-16T05:31:34Z',
    'WARC-Concurrent-To: <urn:uuid:07e1fef0-69e8-11e7-b852-0da77bcdf4dd>',
    'WARC-Record-ID: <urn:uuid:07e1fef0-69e8-11e7-b852-0da77bcdf4dd>',
    'Content-Type: application/http; msgtype=request',
    'Content-Length: 400'
  ]
  t.is(key, buildKeys.builderKeyReq, 'The build key be builderKeyReq')
  t.truthy(builder._req, 'the info map should not be null')
  t.is(builder._req.get('header').length, 2, 'the header array should be 2 after determineWarcType')
  header.forEach(it => {
    builder.addLineTo(key, 0, Buffer.from(it))
  })
  const body = `POST / HTTP/1.1
Host: stringjs.com
Connection: keep-alive
Upgrade-Insecure-Requests: 1
X-DevTools-Request-Id: 12704.1
User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Electron/1.7.4 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8
Accept-Encoding: gzip, deflate
Accept-Language: en-US`.split('\n')
  body.forEach(it => {
    builder.addLineTo(key, 1, Buffer.from(it))
  })
  builder.addLineTo(key, 2, Buffer.from('hello'))
  const builtRecord = builder.buildRecord(key)
  t.truthy(builtRecord, 'the record built should not be null or undefined')
  t.is(builtRecord.type, 'request', 'the type property of the record built should be request')
  t.is(builtRecord.warcType, 'request', 'the type property of the record built should be request')
  t.true(builtRecord instanceof warcRecords.WARCRequestRecord, 'the record returned should be an instance of WARCInfoRecord')
  t.truthy(builtRecord.warcHeader, 'the warcHeader property of the built record should be defined')
  header.forEach(it => {
    let [k, v] = it.split(': ')
    switch (k) {
      case 'WARC-Target-URI':
        t.is(builtRecord.targetURI, v, 'the targetURI getter should return the targetURI')
        break
      case 'WARC-Filename':
        t.is(builtRecord.warcFilename, v, 'the warcFilename getter for the record should return the warcs filename')
        break
      case 'WARC-Record-ID':
        v = v.replace('<urn:uuid:', '').replace('>', '')
        t.is(builtRecord.recordId, v, 'the recordId getter for the record should return the record id')
        break
      case 'Content-Type':
        t.is(builtRecord.warcContentType, v, 'the warc content type getter should return the warc content type')
        break
      case 'WARC-Concurrent-To':
        v = v.replace('<urn:uuid:', '').replace('>', '')
        t.is(builtRecord.concurrentTo, v, 'the concurrent to getter should return the concurrent to id')
        break
      case 'Content-Length':
        v = Number(v)
        t.is(builtRecord.warcContentLength, v, 'the warc content length getter should return the warc content length')
        break
    }
    t.true(k in builtRecord.warcHeader, `the warc header key[${k}] supplied should be in the warcHeader`)
    t.true(v === builtRecord.warcHeader[k], `the value for the warc header key[${k}] should be the one supplied`)
  })
  t.truthy(builtRecord.httpHeaders, 'the httpHeaders property  should not be null')
  body.forEach(it => {
    if (!it.startsWith('POST')) {
      let [k, v] = it.split(': ')
      t.true(k in builtRecord.httpHeaders, `the httpHeaders key[${k}] supplied should be in the httpHeaders`)
      t.true(v === builtRecord.httpHeaders[k], `the value for the httpHeaders key[${k}] should be the one supplied`)
    }
  })
  t.is(builtRecord.httpVersion, 'HTTP/1.1')
  t.is(builtRecord.method, 'POST')
  t.is(builtRecord.requestLine, body[0])
})

test('WARCRecorderBuilder should correctly build a request record if the record is indeed a request record but the build key is unknown', t => {
  const {context: {builder}} = t
  const type = Buffer.from('WARC-Target-URI: http://stringjs.com/\r')
  const begin = Buffer.from('WARC/1.0\r')
  const key = builder.determineWarcType(type, begin)
  const header = [
    'WARC-Type: request\r',
    'WARC-Date: 2017-07-16T05:31:34Z\r',
    'WARC-Concurrent-To: <urn:uuid:07e1fef0-69e8-11e7-b852-0da77bcdf4dd>',
    'WARC-Record-ID: <urn:uuid:07e1fef0-69e8-11e7-b852-0da77bcdf4dd>',
    'Content-Type: application/http; msgtype=request',
    'Content-Length: 400'
  ]
  t.is(key, buildKeys.builderKeyUnknown, 'The build key be builderKeyUnknown')
  header.forEach(it => {
    builder.addLineTo(key, 0, Buffer.from(it))
  })
  const body = `POST / HTTP/1.1
Host: stringjs.com
Connection: keep-alive
Upgrade-Insecure-Requests: 1
X-DevTools-Request-Id: 12704.1
User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Electron/1.7.4 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8
Accept-Encoding: gzip, deflate
Accept-Language: en-US`.split('\n')
  body.forEach(it => {
    builder.addLineTo(key, 1, Buffer.from(it))
  })
  builder.addLineTo(key, 2, Buffer.from('hello'))
  const builtRecord = builder.buildRecord(key)
  t.truthy(builtRecord, 'the record built should not be null or undefined')
  t.is(builtRecord.type, 'request', 'the type property of the record built should be request')
  t.is(builtRecord.warcType, 'request', 'the type property of the record built should be request')
  t.true(builtRecord instanceof warcRecords.WARCRequestRecord, 'the record returned should be an instance of WARCInfoRecord')
  t.truthy(builtRecord.warcHeader, 'the warcHeader property of the built record should be defined')
})

test('WARCRecorderBuilder should correctly build a response record', t => {
  const {context: {builder}} = t
  const type = Buffer.from('WARC-Type: response\r')
  const begin = Buffer.from('WARC/1.0\r')
  const key = builder.determineWarcType(type, begin)
  const header = `WARC-Target-URI: http://stringjs.com/
WARC-Date: 2017-07-16T05:31:34Z
WARC-Record-ID: <urn:uuid:07e72f10-69e8-11e7-b852-0da77bcdf4dd>
Content-Type: application/http; msgtype=response
Content-Length: 70964`.split('\n')
  t.is(key, buildKeys.builderKeyRes, 'The build key be builderKeyRes')
  t.truthy(builder._res, 'the info map should not be null')
  t.is(builder._res.get('header').length, 2, 'the header array should be 2 after determineWarcType')
  header.forEach(it => {
    builder.addLineTo(key, 0, Buffer.from(it))
  })
  const body = `HTTP/1.1 200 OK
Server: GitHub.com
Date: Sun, 16 Jul 2017 05:31:28 GMT
Content-Type: text/html; charset=utf-8
Transfer-Encoding: chunked
Last-Modified: Mon, 22 Sep 2014 14:44:55 GMT
Access-Control-Allow-Origin: *
Expires: Sun, 16 Jul 2017 05:41:28 GMT
Cache-Control: max-age=600
X-GitHub-Request-Id: AE92:0456:5576F1:80DBF9:596AFA30`.split('\n')
  body.forEach(it => {
    builder.addLineTo(key, 1, Buffer.from(it))
  })
  const builtRecord = builder.buildRecord(key)
  t.truthy(builtRecord, 'the record built should not be null or undefined')
  t.is(builtRecord.type, 'response', 'the type property of the record built should be request')
  t.is(builtRecord.warcType, 'response', 'the type property of the record built should be request')
  t.true(builtRecord instanceof warcRecords.WARCResponseRecord, 'the record returned should be an instance of WARCInfoRecord')
  t.truthy(builtRecord.warcHeader, 'the warcHeader property of the built record should be defined')
  header.forEach(it => {
    let [k, v] = it.split(': ')
    switch (k) {
      case 'WARC-Target-URI':
        t.is(builtRecord.targetURI, v, 'the targetURI getter should return the targetURI')
        break
      case 'WARC-Filename':
        t.is(builtRecord.warcFilename, v, 'the warcFilename getter for the record should return the warcs filename')
        break
      case 'WARC-Record-ID':
        v = v.replace('<urn:uuid:', '').replace('>', '')
        t.is(builtRecord.recordId, v, 'the recordId getter for the record should return the record id')
        break
      case 'Content-Type':
        t.is(builtRecord.warcContentType, v, 'the warc content type getter should return the warc content type')
        break
      case 'WARC-Concurrent-To':
        v = v.replace('<urn:uuid:', '').replace('>', '')
        t.is(builtRecord.concurrentTo, v, 'the concurrent to getter should return the concurrent to id')
        break
      case 'Content-Length':
        v = Number(v)
        t.is(builtRecord.warcContentLength, v, 'the warc content length getter should return the warc content length')
        break
    }
    t.true(k in builtRecord.warcHeader, `the warc header key[${k}] supplied should be in the warcHeader`)
    t.true(v === builtRecord.warcHeader[k], `the value for the warc header key[${k}] should be the one supplied`)
  })
  t.truthy(builtRecord.httpHeaders, 'the httpHeaders property  should not be null')
  body.forEach(it => {
    if (it !== 'HTTP/1.1 200 OK') {
      let [k, v] = it.split(': ')
      t.true(k in builtRecord.httpHeaders, `the httpHeaders key[${k}] supplied should be in the httpHeaders`)
      t.true(v === builtRecord.httpHeaders[k], `the value for the httpHeaders key[${k}] should be the one supplied`)
    }
  })
  t.is(builtRecord.httpVersion, 'HTTP/1.1')
  t.is(builtRecord.statusCode, 200)
  t.is(builtRecord.statusReason, 'OK')
  t.is(builtRecord.statusLine, body[0])
})

test('WARCRecorderBuilder should correctly build a response record if the record is indeed a response record but the build key is unknown', t => {
  const {context: {builder}} = t
  const type = Buffer.from('WARC-Target-URI: http://stringjs.com/\r')
  const begin = Buffer.from('WARC/1.0\r')
  const key = builder.determineWarcType(type, begin)
  const header = `WARC-Type: response\r
WARC-Date: 2017-07-16T05:31:34Z
WARC-Record-ID: <urn:uuid:07e72f10-69e8-11e7-b852-0da77bcdf4dd>
Content-Type: application/http; msgtype=response
Content-Length: 70964`.split('\n')
  t.is(key, buildKeys.builderKeyUnknown, 'The build key be builderKeyRes')
  header.forEach(it => {
    builder.addLineTo(key, 0, Buffer.from(it))
  })
  const body = `HTTP/1.1 200 OK
Server: GitHub.com
Date: Sun, 16 Jul 2017 05:31:28 GMT
Content-Type: text/html; charset=utf-8
Transfer-Encoding: chunked
Last-Modified: Mon, 22 Sep 2014 14:44:55 GMT
Access-Control-Allow-Origin: *
Expires: Sun, 16 Jul 2017 05:41:28 GMT
Cache-Control: max-age=600
X-GitHub-Request-Id: AE92:0456:5576F1:80DBF9:596AFA30`.split('\n')
  body.forEach(it => {
    builder.addLineTo(key, 1, Buffer.from(it))
  })
  const builtRecord = builder.buildRecord(key)
  t.truthy(builtRecord, 'the record built should not be null or undefined')
  t.is(builtRecord.type, 'response', 'the type property of the record built should be request')
  t.is(builtRecord.warcType, 'response', 'the type property of the record built should be request')
  t.true(builtRecord instanceof warcRecords.WARCResponseRecord, 'the record returned should be an instance of WARCInfoRecord')
})

test('WARCRecorderBuilder should correctly build a revisit record', t => {
  const {context: {builder}} = t
  const type = Buffer.from('WARC-Type: revisit\r')
  const begin = Buffer.from('WARC/1.0\r')
  const key = builder.determineWarcType(type, begin)
  const header = `WARC-Target-URI: http://stringjs.com/
WARC-Date: 2017-07-16T05:31:34Z
WARC-Record-ID: <urn:uuid:07e72f10-69e8-11e7-b852-0da77bcdf4dd>
Content-Type: application/http; msgtype=response
Content-Length: 70964
WARC-Refers-To-Target-URI: http://stringjs.com/
WARC-Refers-To-Date: 2017-07-12T18:29:00Z`.split('\n')
  t.is(key, buildKeys.builderKeyRev, 'The build key be builderKeyRes')
  t.truthy(builder._rev, 'the info map should not be null')
  t.is(builder._rev.get('header').length, 2, 'the header array should be 2 after determineWarcType')
  header.forEach(it => {
    builder.addLineTo(key, 0, Buffer.from(it))
  })
  const httpHeaders = `HTTP/1.1 204 No Content
Access-Control-Allow-Origin: *
Access-Control-Expose-Headers: Date,X-Mendeley-Trace-Id
Date: Sun, 12 Feb 2017 18:29:01 GMT
X-Mendeley-Trace-Id: WKXqV7EyqSA
Connection: keep-alive`.split('\n')
  httpHeaders.forEach(it => {
    builder.addLineTo(key, 1, Buffer.from(it))
  })
  const builtRecord = builder.buildRecord(key)
  t.truthy(builtRecord, 'the record built should not be null or undefined')
  t.is(builtRecord.type, 'revisit', 'the type property of the record built should be request')
  t.is(builtRecord.warcType, 'revisit', 'the type property of the record built should be request')
  t.true(builtRecord instanceof warcRecords.WARCRevisitRecord, 'the record returned should be an instance of WARCInfoRecord')
  t.truthy(builtRecord.warcHeader, 'the warcHeader property of the built record should be defined')
  header.forEach(it => {
    let [k, v] = it.split(': ')
    switch (k) {
      case 'WARC-Target-URI':
        t.is(builtRecord.targetURI, v, 'the targetURI getter should return the targetURI')
        break
      case 'WARC-Filename':
        t.is(builtRecord.warcFilename, v, 'the warcFilename getter for the record should return the warcs filename')
        break
      case 'WARC-Record-ID':
        v = v.replace('<urn:uuid:', '').replace('>', '')
        t.is(builtRecord.recordId, v, 'the recordId getter for the record should return the record id')
        break
      case 'Content-Type':
        t.is(builtRecord.warcContentType, v, 'the warc content type getter should return the warc content type')
        break
      case 'WARC-Concurrent-To':
        v = v.replace('<urn:uuid:', '').replace('>', '')
        t.is(builtRecord.concurrentTo, v, 'the concurrent to getter should return the concurrent to id')
        break
      case 'Content-Length':
        v = Number(v)
        t.is(builtRecord.warcContentLength, v, 'the warc content length getter should return the warc content length')
        break
    }
    t.true(k in builtRecord.warcHeader, `the warc header key[${k}] supplied should be in the warcHeader`)
    t.true(v === builtRecord.warcHeader[k], `the value for the warc header key[${k}] should be the one supplied`)
  })
  t.truthy(builtRecord.httpHeaders, 'the httpHeaders property  should not be null')
  httpHeaders.forEach(it => {
    if (!it.startsWith('HTTP/1.1')) {
      let [k, v] = it.split(': ')
      t.true(k in builtRecord.httpHeaders, `the httpHeaders key[${k}] supplied should be in the httpHeaders`)
      t.true(v === builtRecord.httpHeaders[k], `the value for the httpHeaders key[${k}] should be the one supplied`)
    }
  })
  t.is(builtRecord.httpVersion, 'HTTP/1.1')
  t.is(builtRecord.statusCode, 204)
  t.is(builtRecord.statusReason, 'No Content')
  t.is(builtRecord.statusLine, httpHeaders[0])
})

test('WARCRecorderBuilder should correctly build a revisit record if the record is indeed a revisit record but the build key is unknown', t => {
  const {context: {builder}} = t
  const type = Buffer.from('WARC-Target-URI: http://stringjs.com/\r')
  const begin = Buffer.from('WARC/1.0\r')
  const key = builder.determineWarcType(type, begin)
  const header = `WARC-Type: revisit\r
WARC-Date: 2017-07-16T05:31:34Z
WARC-Record-ID: <urn:uuid:07e72f10-69e8-11e7-b852-0da77bcdf4dd>
Content-Type: application/http; msgtype=response
Content-Length: 70964
WARC-Refers-To-Target-URI: http://stringjs.com/
WARC-Refers-To-Date: 2017-07-12T18:29:00Z`.split('\n')
  t.is(key, buildKeys.builderKeyUnknown, 'The build key be builderKeyUnknown')
  header.forEach(it => {
    builder.addLineTo(key, 0, Buffer.from(it))
  })
  const httpHeaders = `HTTP/1.1 204 No Content
Access-Control-Allow-Origin: *
Access-Control-Expose-Headers: Date,X-Mendeley-Trace-Id
Date: Sun, 12 Feb 2017 18:29:01 GMT
X-Mendeley-Trace-Id: WKXqV7EyqSA
Connection: keep-alive`.split('\n')
  httpHeaders.forEach(it => {
    builder.addLineTo(key, 1, Buffer.from(it))
  })
  const builtRecord = builder.buildRecord(key)
  t.truthy(builtRecord, 'the record built should not be null or undefined')
  t.is(builtRecord.type, 'revisit', 'the type property of the record built should be revisit')
  t.is(builtRecord.warcType, 'revisit', 'the type property of the record built should be revisit')
  t.true(builtRecord instanceof warcRecords.WARCRevisitRecord, 'the record returned should be an instance of WARCRevisitRecord')
})

test('WARCRecorderBuilder should correctly build a resource record', t => {
  const {context: {builder}} = t
  const type = Buffer.from('WARC-Type: resource\r')
  const begin = Buffer.from('WARC/1.0\r')
  const key = builder.determineWarcType(type, begin)
  const header = `WARC-Record-ID: <urn:uuid:abe2831f-e80d-11e7-9e6f-10bf487d9875>
WARC-Target-URI: https://github.com/webrecorder/warcitgithub-8100b9bf1eb6ed8b38eaad2fe7ba51d1895aa0602aafe4a87068d444e07e8c5c.css
WARC-Payload-Digest: sha1:HDYDL7N3G747S6K4ZC2NN5AKND3FXLGX
WARC-Block-Digest: sha1:HDYDL7N3G747S6K4ZC2NN5AKND3FXLGX
Content-Type: text/css
Content-Length: 408394`.split('\n')
  t.is(key, buildKeys.builderKeyResource, 'The build key be builderKeyRes')
  t.truthy(builder._resource, 'the info map should not be null')
  t.is(builder._resource.get('header').length, 2, 'the header array should be 2 after determineWarcType')
  header.forEach(it => {
    builder.addLineTo(key, 0, Buffer.from(it))
  })
  builder.addLineTo(key, 1, Buffer.from('whatever'))
  const builtRecord = builder.buildRecord(key)
  t.truthy(builtRecord, 'the record built should not be null or undefined')
  t.is(builtRecord.type, 'resource', 'the type property of the record built should be request')
  t.is(builtRecord.warcType, 'resource', 'the type property of the record built should be request')
  t.true(builtRecord instanceof warcRecords.WARCResourceRecord, 'the record returned should be an instance of WARCInfoRecord')
  t.truthy(builtRecord.warcHeader, 'the warcHeader property of the built record should be defined')
  header.forEach(it => {
    let [k, v] = it.split(': ')
    switch (k) {
      case 'WARC-Target-URI':
        t.is(builtRecord.targetURI, v, 'the targetURI getter should return the targetURI')
        break
      case 'WARC-Filename':
        t.is(builtRecord.warcFilename, v, 'the warcFilename getter for the record should return the warcs filename')
        break
      case 'WARC-Record-ID':
        v = v.replace('<urn:uuid:', '').replace('>', '')
        t.is(builtRecord.recordId, v, 'the recordId getter for the record should return the record id')
        break
      case 'Content-Type':
        t.is(builtRecord.warcContentType, v, 'the warc content type getter should return the warc content type')
        break
      case 'WARC-Concurrent-To':
        v = v.replace('<urn:uuid:', '').replace('>', '')
        t.is(builtRecord.concurrentTo, v, 'the concurrent to getter should return the concurrent to id')
        break
      case 'Content-Length':
        v = Number(v)
        t.is(builtRecord.warcContentLength, v, 'the warc content length getter should return the warc content length')
        break
    }
    t.true(k in builtRecord.warcHeader, `the warc header key[${k}] supplied should be in the warcHeader`)
    t.true(v === builtRecord.warcHeader[k], `the value for the warc header key[${k}] should be the one supplied`)
  })
})

test('WARCRecorderBuilder should correctly build a resource record if the record is indeed a resource record but the build key is unknown', t => {
  const {context: {builder}} = t
  const type = Buffer.from('WARC-Record-ID: <urn:uuid:abe2831f-e80d-11e7-9e6f-10bf487d9875>\r')
  const begin = Buffer.from('WARC/1.0\r')
  const key = builder.determineWarcType(type, begin)
  const header = `WARC-Type: resource\r
WARC-Target-URI: https://github.com/webrecorder/warcitgithub-8100b9bf1eb6ed8b38eaad2fe7ba51d1895aa0602aafe4a87068d444e07e8c5c.css
WARC-Payload-Digest: sha1:HDYDL7N3G747S6K4ZC2NN5AKND3FXLGX
WARC-Block-Digest: sha1:HDYDL7N3G747S6K4ZC2NN5AKND3FXLGX
Content-Type: text/css
Content-Length: 408394`.split('\n')
  t.is(key, buildKeys.builderKeyUnknown, 'The build key be builderKeyRes')
  header.forEach(it => {
    builder.addLineTo(key, 0, Buffer.from(it))
  })
  builder.addLineTo(key, 1, Buffer.from('whatever'))
  const builtRecord = builder.buildRecord(key)
  t.truthy(builtRecord, 'the record built should not be null or undefined')
  t.is(builtRecord.type, 'resource', 'the type property of the record built should be request')
  t.is(builtRecord.warcType, 'resource', 'the type property of the record built should be request')
  t.true(builtRecord instanceof warcRecords.WARCResourceRecord, 'the record returned should be an instance of WARCInfoRecord')
})

test('WARCRecorderBuilder should correctly build a unknown record', t => {
  const {context: {builder}} = t
  const type = Buffer.from('WARC-Type: dummy\r')
  const begin = Buffer.from('WARC/1.0\r')
  const key = builder.determineWarcType(type, begin)
  const header = [
    'WARC-Filename: dummy.warc',
    'WARC-Date: 2017-07-16T05:31:34Z',
    'WARC-Record-ID: <urn:uuid:07e1fef0-69e8-11e7-b852-0da77bcdf4dd>',
    'Content-Type: application/warc-fields',
    'Content-Length: 3064'
  ]
  t.is(key, buildKeys.builderKeyUnknown, 'The build key for unknown should be builderKeyUnknown')
  t.truthy(builder._unkown, 'the unknown record map should not be null when the builderKey is builderKeyUnknown')
  t.is(builder._unkown.get('header').length, 2, 'the header array for the unknown record should be 2 when the builderKey is builderKeyUnknown after determineWarcType')
  header.forEach(it => {
    const b = Buffer.from(it)
    builder.addLineTo(key, 0, b)
    builder.addLineTo(key, 1, b)
    builder.addLineTo(key, 2, b)
  })
  t.is(builder._unkown.get('header').length, 7, 'the header array for the unknown record should be 7 after adding the unknown warc header')
  t.is(builder._unkown.get(1).length, 5, 'the array for the contents of the ctrlf count=1 for the unknown record should be 5')
  t.is(builder._unkown.get(2).length, 5, 'the array for the contents of the ctrlf count=2 for the unknown record should be 5')
  const builtRecord = builder.buildRecord(key)
  t.truthy(builtRecord, 'the record built for builderKeyUnknown should not be null or undefined')
  t.is(builtRecord.type, 'unknown', 'the type property of the record built for builderKeyUnknown should be unknown')
  t.true(builtRecord instanceof warcRecords.WARCUnknownRecord, 'the record returned should be an instance of WARCUnknownRecord')
  t.truthy(builtRecord.warcHeader, 'the warcHeader property of the built record should be defined')
  header.forEach(it => {
    let [k, v] = it.split(': ')
    t.true(k in builtRecord.warcHeader, `the warc header key[${k}] supplied should be in the warcHeader`)
    if (k === 'WARC-Record-ID') {
      v = v.replace('<urn:uuid:', '').replace('>', '')
    } else if (k === 'Content-Length') {
      v = Number(v)
    }
    t.true(v === builtRecord.warcHeader[k], `the value for the warc header key[${k}] should be the one supplied`)
  })
  t.truthy(builtRecord.otherBuffers, 'the other buffers property for the unknown record should not be null')
  t.is(builtRecord.otherBuffers.length, 2, 'the length of the other buffers property should be 2')
})

test('WARCRecorderBuilder should populate and clear all internal maps', t => {
  const {context: {builder}} = t
  builder.initInfo('1', '2')
  builder.initMdata('1', '2')
  builder.initReq('1', '2')
  builder.initRes('1', '2')
  builder.initResource('1', '2')
  builder.initRevist('1', '2')
  builder.initUnknown('1', '2')
  t.true(builder._info.size === 2, 'the info map should be size 2 when initialize')
  t.true(builder._mdata.size === 2, 'the metadata map should be size 2 when initialize')
  t.true(builder._req.size === 3, 'the request map should be size 3 when initialize')
  t.true(builder._res.size === 3, 'the response map should be size 3 when initialize')
  t.true(builder._resource.size === 2, 'the resource map should be size 2 when initialize')
  t.true(builder._unkown.size === 1, 'the unknown map should be size 1 when initialize')
  builder.clear()
  t.true(builder._info.size === 0, 'the info map should be size 0 when cleared')
  t.true(builder._mdata.size === 0, 'the metadata map should be size 0 when cleared')
  t.true(builder._req.size === 0, 'the request map should be size 0 when cleared')
  t.true(builder._res.size === 0, 'the response map should be size 0 when cleared')
  t.true(builder._resource.size === 0, 'the resource map should be size 0 when cleared')
  t.true(builder._unkown.size === 0, 'the unknown map should be size 0 when cleared')
})
