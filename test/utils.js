import test from 'ava'
import { FakeElectronDebugger } from './helpers/mocks'
import GZD from '../lib/parsers/gzipDetector'
import { isEmptyPlainObject, getResBodyElectron } from '../lib/utils'
import ElectronGetResError from '../lib/utils/electronGetResError'
import { warcs } from './helpers/filePaths'

test('getResBodyElectron', async t => {
  const fed = new FakeElectronDebugger()
  const requestId = 12345
  const errorMessage = `An Error Occurred retrieving the response body for ${requestId}`
  await t.notThrows(
    getResBodyElectron(requestId, fed),
    'getResBodyElectron should not throw an error when the request id has a body'
  )
  t.is(1, fed.calls, 'the debugger sendCommand function should be called')
  t.is(
    requestId,
    fed.args.requestId,
    'the debugger sendCommand function should use the request id supplied'
  )
  t.is(
    'Network.getResponseBody',
    fed.commandSent,
    'the command sent should be Network.getResponseBody'
  )
  fed.reset(true)
  const error = await t.throws(getResBodyElectron(requestId, fed), ElectronGetResError)
  t.is(1, fed.calls, 'the debugger sendCommand function should be called when rejects')
  t.is(
    requestId,
    fed.args.requestId,
    'the debugger sendCommand function should use the request id supplied when rejects'
  )
  t.is(
    'Network.getResponseBody',
    fed.commandSent,
    'the command sent should be Network.getResponseBody when rejects'
  )
  t.is(
    error.message,
    errorMessage,
    'the error message should be the default message when no error message is present in the original error'
  )
  t.truthy(
    error.oError,
    'the original error message should be a property of the error thrown'
  )
  t.is(error.rid, requestId, 'the request id should be a property of the error thrown')
})

test('isEmptyPlainObject', t => {
  t.true(isEmptyPlainObject(null), 'isEmptyPlainObject should return true for null')
  t.true(
    isEmptyPlainObject(undefined),
    'isEmptyPlainObject should return true for undefined'
  )
  t.true(
    isEmptyPlainObject({}),
    'isEmptyPlainObject should return true for an empty object'
  )
  t.false(
    isEmptyPlainObject({ a: 1 }),
    'isEmptyPlainObject should return false for a non-empty object'
  )
})

test('gzipDetector', async t => {
  t.true(
    await GZD.isGzipped(warcs.gzipped),
    'GzipDetector should return true when a file is gzipped async'
  )
  t.false(
    await GZD.isGzipped(warcs.notGz),
    'GzipDetector should return false when a file is not gzipped async'
  )
  t.true(
    GZD.isGzippedSync(warcs.gzipped),
    'GzipDetector should return true when a file is gzipped sync'
  )
  t.false(
    GZD.isGzippedSync(warcs.notGz),
    'GzipDetector should return false when a file is not gzipped sync'
  )
  t.throws(() => GZD.isGzippedSync(null), 'The filePath path is null')
  t.throws(() => GZD.isGzippedSync(undefined), 'The filePath path is undefined')
  await t.throws(GZD.isGzipped(null), 'The filePath path is null')
  await t.throws(GZD.isGzipped(undefined), 'The filePath path is undefined')
})
