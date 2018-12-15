import test from 'ava'
import uuid from 'uuid/v4'
import {
  makeDate,
  countCRLFs,
  parseWARCHeader,
  parseKVContent,
  checkRecordId
} from './helpers/warcHelpers'
import {
  WARCV,
  WARCTypes,
  WARCContentTypes,
  requiredHeaderFields,
  warcInfoHeader,
  warcInfoContent,
  warcMetadataHeader,
  warcRequestHeader,
  warcResponseHeader
} from '../lib/writers/warcFields'

const targetURI = 'http://example.com'
const rid = uuid()
const wid = uuid()
const concurrentTo = uuid()
const fileName = 'dummy.warc'
const date = makeDate()
const len = 1
const version = 'a.b.c'
const isPartOfV = 'Testing'
const warcInfoDescription = 'Testing all the things'
const ua = 'Testing browser'

test('The requiredHeaderFields function should include the targetURI field if it is not null', t => {
  const results = requiredHeaderFields(WARCTypes.warcinfo, {
    rid,
    date,
    len,
    targetURI
  })
  t.is(countCRLFs(results), 6)
  const parsed = parseWARCHeader(results)
  t.is(parsed['WARC'], WARCV)
  t.is(parsed['WARC-Type'], WARCTypes.warcinfo)
  t.true(checkRecordId(parsed['WARC-Record-ID']))
  t.is(parsed['WARC-Record-ID'], `<urn:uuid:${rid}>`)
  t.is(parsed['WARC-Target-URI'], targetURI)
  t.is(parsed['WARC-Date'], date)
  t.is(parsed['Content-Length'], `${len}`)
})

test('The requiredHeaderFields function should not include the targetURI field if it is null', t => {
  const results = requiredHeaderFields(WARCTypes.warcinfo, {
    rid,
    date,
    len
  })
  t.is(countCRLFs(results), 5)
  const parsed = parseWARCHeader(results)
  t.is(parsed['WARC'], WARCV)
  t.is(parsed['WARC-Type'], WARCTypes.warcinfo)
  t.true(checkRecordId(parsed['WARC-Record-ID']))
  t.is(parsed['WARC-Record-ID'], `<urn:uuid:${rid}>`)
  t.falsy(parsed['WARC-Target-URI'])
  t.is(parsed['WARC-Date'], date)
  t.is(parsed['Content-Length'], `${len}`)
})

test('The warcInfoHeader function should include both the targetURI and fileName field if both are not null', t => {
  const results = warcInfoHeader({
    rid,
    date,
    len,
    targetURI,
    fileName
  })
  t.is(countCRLFs(results), 8)
  const parsed = parseWARCHeader(results)
  t.is(parsed['WARC'], WARCV)
  t.is(parsed['WARC-Type'], WARCTypes.warcinfo)
  t.true(checkRecordId(parsed['WARC-Record-ID']))
  t.is(parsed['WARC-Record-ID'], `<urn:uuid:${rid}>`)
  t.is(parsed['WARC-Target-URI'], targetURI)
  t.is(parsed['WARC-Date'], date)
  t.is(parsed['Content-Length'], `${len}`)
  t.is(parsed['WARC-Filename'], fileName)
  t.is(
    parsed['Content-Type'],
    WARCContentTypes.warcFields.split(': ')[1].trim()
  )
})

test('The warcInfoHeader function should not include the targetURI or fileName field if either are null', t => {
  const withOutFileName = warcInfoHeader({
    rid,
    date,
    len,
    targetURI
  })
  t.is(countCRLFs(withOutFileName), 7)
  const noFN = parseWARCHeader(withOutFileName)
  t.is(noFN['WARC'], WARCV, 'WARC revision no good without filename')
  t.is(
    noFN['WARC-Type'],
    WARCTypes.warcinfo,
    'WARC type no good without filename'
  )
  t.true(
    checkRecordId(noFN['WARC-Record-ID']),
    'WARC record id no good without filename (1)'
  )
  t.is(
    noFN['WARC-Record-ID'],
    `<urn:uuid:${rid}>`,
    'WARC record id no good without filename (2)'
  )
  t.is(
    noFN['WARC-Target-URI'],
    targetURI,
    'WARC target URI no good without filename'
  )
  t.is(noFN['WARC-Date'], date, 'WARC date no good without filename')
  t.is(
    noFN['Content-Length'],
    `${len}`,
    'WARC content len no good without filename'
  )
  t.falsy(
    noFN['WARC-Filename'],
    'The filename field was included when it was not supplied'
  )
  t.is(noFN['Content-Type'], WARCContentTypes.warcFields.split(': ')[1].trim())

  const withoutTargetURI = warcInfoHeader({
    rid,
    date,
    len,
    fileName
  })
  t.is(countCRLFs(withoutTargetURI), 7)
  const noTU = parseWARCHeader(withoutTargetURI)
  t.is(noTU['WARC'], WARCV, 'WARC revision no good without target URI')
  t.is(
    noTU['WARC-Type'],
    WARCTypes.warcinfo,
    'WARC type no good without target URI'
  )
  t.true(
    checkRecordId(noTU['WARC-Record-ID']),
    'WARC record id no good without target URI (1)'
  )
  t.is(
    noTU['WARC-Record-ID'],
    `<urn:uuid:${rid}>`,
    'WARC record id no good target URI target URI (2)'
  )
  t.falsy(
    noTU['WARC-Target-URI'],
    'The target URI field was included when it was not supplied'
  )
  t.is(noTU['WARC-Date'], date, 'WARC date no good without target URI')
  t.is(
    noTU['Content-Length'],
    `${len}`,
    'WARC content len no good without target URI'
  )
  t.is(
    noTU['WARC-Filename'],
    fileName,
    'The filename field is no good without target URI'
  )
  t.is(noTU['Content-Type'], WARCContentTypes.warcFields.split(': ')[1].trim())
})

test('warcInfoContent should only include format if nothing else is supplied', t => {
  const infoContent = warcInfoContent({})
  t.is(countCRLFs(infoContent), 1)
  const parsed = parseKVContent(infoContent)
  t.is(parsed['format'], `WARC File Format ${WARCV}`)
})

test('warcInfoContent should include the key values of the supplied object', t => {
  const infoContent = warcInfoContent({
    software: version,
    isPartOf: isPartOfV,
    description: warcInfoDescription
  })
  t.is(countCRLFs(infoContent), 4)
  const parsed = parseKVContent(infoContent)
  t.is(parsed['software'], version)
  t.is(parsed['format'], `WARC File Format ${WARCV}`)
  t.is(parsed['isPartOf'], isPartOfV)
  t.is(parsed['description'], warcInfoDescription)
})

test('warcMetadataHeader should not include concurrentTo or warc info id they are supplied', t => {
  const metadataHeader = warcMetadataHeader({
    targetURI,
    now: date,
    rid,
    len
  })
  t.is(countCRLFs(metadataHeader), 7)
  const parsed = parseWARCHeader(metadataHeader)
  t.is(parsed['WARC'], WARCV)
  t.is(parsed['WARC-Type'], WARCTypes.metadata)
  t.is(
    parsed['Content-Type'],
    WARCContentTypes.warcFields.trim().split(': ')[1]
  )
  t.true(checkRecordId(parsed['WARC-Record-ID']))
  t.is(parsed['WARC-Record-ID'], `<urn:uuid:${rid}>`)
  t.is(parsed['WARC-Target-URI'], targetURI)
  t.is(parsed['WARC-Date'], date)
  t.is(parsed['Content-Length'], `${len}`)
  t.falsy(parsed['WARC-Concurrent-To'])
  t.falsy(parsed['WARC-Warcinfo-ID'])
})

test('warcMetadataHeader should include both concurrentTo and warc info id they are supplied', t => {
  const metadataHeader = warcMetadataHeader({
    targetURI,
    now: date,
    rid,
    len,
    wid,
    concurrentTo
  })
  t.is(countCRLFs(metadataHeader), 9)
  const parsed = parseWARCHeader(metadataHeader)
  t.is(parsed['WARC'], WARCV)
  t.is(parsed['WARC-Type'], WARCTypes.metadata)
  t.is(
    parsed['Content-Type'],
    WARCContentTypes.warcFields.trim().split(': ')[1]
  )
  t.true(checkRecordId(parsed['WARC-Record-ID']))
  t.is(parsed['WARC-Record-ID'], `<urn:uuid:${rid}>`)
  t.true(checkRecordId(parsed['WARC-Concurrent-To']))
  t.is(parsed['WARC-Concurrent-To'], `<urn:uuid:${concurrentTo}>`)
  t.true(checkRecordId(parsed['WARC-Warcinfo-ID']))
  t.is(parsed['WARC-Warcinfo-ID'], `<urn:uuid:${wid}>`)
  t.is(parsed['WARC-Target-URI'], targetURI)
  t.is(parsed['WARC-Date'], date)
  t.is(parsed['Content-Length'], `${len}`)
})

test('warcRequestHeader should not include both concurrentTo or warc info id they are not supplied', t => {
  const metadataHeader = warcRequestHeader({
    targetURI,
    now: date,
    rid,
    len
  })
  t.is(countCRLFs(metadataHeader), 7)
  const parsed = parseWARCHeader(metadataHeader)
  t.is(parsed['WARC'], WARCV)
  t.is(parsed['WARC-Type'], WARCTypes.request)
  t.is(
    parsed['Content-Type'],
    WARCContentTypes.httpRequest.trim().split(': ')[1]
  )
  t.true(checkRecordId(parsed['WARC-Record-ID']))
  t.is(parsed['WARC-Record-ID'], `<urn:uuid:${rid}>`)
  t.is(parsed['WARC-Target-URI'], targetURI)
  t.is(parsed['WARC-Date'], date)
  t.is(parsed['Content-Length'], `${len}`)
  t.falsy(parsed['WARC-Concurrent-To'])
  t.falsy(parsed['WARC-Warcinfo-ID'])
})

test('warcRequestHeader should include both concurrentTo and warc info id they are supplied', t => {
  const metadataHeader = warcRequestHeader({
    targetURI,
    now: date,
    rid,
    len,
    wid,
    concurrentTo
  })
  t.is(countCRLFs(metadataHeader), 9)
  const parsed = parseWARCHeader(metadataHeader)
  t.is(parsed['WARC'], WARCV)
  t.is(parsed['WARC-Type'], WARCTypes.request)
  t.is(
    parsed['Content-Type'],
    WARCContentTypes.httpRequest.trim().split(': ')[1]
  )
  t.true(checkRecordId(parsed['WARC-Record-ID']))
  t.is(parsed['WARC-Record-ID'], `<urn:uuid:${rid}>`)
  t.true(checkRecordId(parsed['WARC-Concurrent-To']))
  t.is(parsed['WARC-Concurrent-To'], `<urn:uuid:${concurrentTo}>`)
  t.true(checkRecordId(parsed['WARC-Warcinfo-ID']))
  t.is(parsed['WARC-Warcinfo-ID'], `<urn:uuid:${wid}>`)
  t.is(parsed['WARC-Target-URI'], targetURI)
  t.is(parsed['WARC-Date'], date)
  t.is(parsed['Content-Length'], `${len}`)
})

test('warcResponseHeader should not include the warc info id it is not supplied', t => {
  const metadataHeader = warcResponseHeader({
    targetURI,
    now: date,
    rid,
    len
  })
  t.is(countCRLFs(metadataHeader), 7)
  const parsed = parseWARCHeader(metadataHeader)
  t.is(parsed['WARC'], WARCV)
  t.is(parsed['WARC-Type'], WARCTypes.response)
  t.is(
    parsed['Content-Type'],
    WARCContentTypes.httpResponse.trim().split(': ')[1]
  )
  t.true(checkRecordId(parsed['WARC-Record-ID']))
  t.is(parsed['WARC-Record-ID'], `<urn:uuid:${rid}>`)
  t.is(parsed['WARC-Target-URI'], targetURI)
  t.is(parsed['WARC-Date'], date)
  t.is(parsed['Content-Length'], `${len}`)
  t.falsy(parsed['WARC-Warcinfo-ID'])
})

test('warcResponseHeader should include the warc info id it is supplied', t => {
  const metadataHeader = warcResponseHeader({
    targetURI,
    now: date,
    rid,
    len,
    wid,
    concurrentTo
  })
  t.is(countCRLFs(metadataHeader), 8)
  const parsed = parseWARCHeader(metadataHeader)
  t.is(parsed['WARC'], WARCV)
  t.is(parsed['WARC-Type'], WARCTypes.response)
  t.is(
    parsed['Content-Type'],
    WARCContentTypes.httpResponse.trim().split(': ')[1]
  )
  t.true(checkRecordId(parsed['WARC-Record-ID']))
  t.is(parsed['WARC-Record-ID'], `<urn:uuid:${rid}>`)
  t.true(checkRecordId(parsed['WARC-Warcinfo-ID']))
  t.is(parsed['WARC-Warcinfo-ID'], `<urn:uuid:${wid}>`)
  t.is(parsed['WARC-Target-URI'], targetURI)
  t.is(parsed['WARC-Date'], date)
  t.is(parsed['Content-Length'], `${len}`)
})
