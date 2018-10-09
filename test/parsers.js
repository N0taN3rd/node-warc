import test from 'ava'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'
import AutoWARCParser from '../lib/parsers'
import WARCGzParser from '../lib/parsers/warcGzParser'
import WARCParser from '../lib/parsers/warcParser'
import { warcs } from './helpers/filePaths'

test.serial('AutoWARCParser should parse gzipped warcs', t => {
  t.plan(32)
  const parser = new AutoWARCParser(warcs.gzipped)
  const observable = Observable.create(observer => {
    parser.on('record', record => {
      observer.next(record)
    })
    parser.on('done', finalRecord => {
      observer.next(finalRecord)
      observer.complete()
    })
    parser.start()
    t.false(parser.start(), 'AutoWARCParser.start should return false when started')
    t.false(
      parser.parseWARC(),
      'AutoWARCParser.parseWARC should return false when started'
    )
  })
  return observable.pipe(map(rec => t.truthy(rec)))
})

test.serial('AutoWARCParser should parse non-gzipped warcs', t => {
  t.plan(32)
  const parser = new AutoWARCParser(warcs.notGz)
  const observable = Observable.create(observer => {
    parser.on('record', record => {
      observer.next(record)
    })
    parser.on('done', finalRecord => {
      observer.next(finalRecord)
      observer.complete()
    })
    parser.start()
    t.false(parser.start(), 'AutoWARCParser.start should return false when started')
    t.false(
      parser.parseWARC(),
      'AutoWARCParser.parseWARC should return false when started'
    )
  })
  return observable.pipe(map(rec => t.truthy(rec)))
})

test.serial(
  'AutoWARCParser should parse a gzipped warc and then a non-gzipped warc back to back',
  t => {
    t.plan(62)
    const parser = new AutoWARCParser(warcs.gzipped)
    let didFirst = false
    const observable = Observable.create(observer => {
      parser.on('record', record => {
        observer.next(record)
      })
      parser.on('done', finalRecord => {
        observer.next(finalRecord)
        if (didFirst) {
          observer.complete()
        } else {
          parser.parseWARC(warcs.notGz)
          didFirst = true
        }
      })
      parser.start()
      t.false(parser.start(), 'AutoWARCParser.start should return false when started')
      t.false(
        parser.parseWARC(),
        'AutoWARCParser.parseWARC should return false when started'
      )
    })
    return observable.pipe(map(rec => t.truthy(rec)))
  }
)

test.serial('WARCGzParser should parse gzipped warcs', t => {
  t.plan(32)
  const parser = new WARCGzParser(warcs.gzipped)
  const observable = Observable.create(observer => {
    parser.on('error', error => {
      observer.error(error)
    })
    parser.on('record', record => {
      observer.next(record)
    })
    parser.on('done', finalRecord => {
      observer.next(finalRecord)
      observer.complete()
    })
    parser.start()
    t.false(parser.start(), 'AutoWARCParser.start should return false when started')
    t.false(
      parser.parseWARC(),
      'AutoWARCParser.parseWARC should return false when started'
    )
  })
  return observable.pipe(map(rec => t.truthy(rec)))
})

test.serial('WARCParser should parse non-gzipped warcs', t => {
  t.plan(32)
  const parser = new WARCParser(warcs.notGz)
  const observable = Observable.create(observer => {
    parser.on('error', error => {
      observer.error(error)
    })
    parser.on('record', record => {
      observer.next(record)
    })
    parser.on('done', finalRecord => {
      observer.next(finalRecord)
      observer.complete()
    })
    parser.start()
    t.false(parser.start(), 'AutoWARCParser.start should return false when started')
    t.false(
      parser.parseWARC(),
      'AutoWARCParser.parseWARC should return false when started'
    )
  })
  return observable.pipe(map(rec => t.truthy(rec)))
})

test('WARCParsers should throw errors when warc path is null or undefined when start or parseWARC is called', t => {
  let parser = new AutoWARCParser()
  t.throws(() => parser.start())
  t.throws(() => parser.parseWARC())
  parser = new WARCGzParser()
  t.throws(() => parser.start())
  t.throws(() => parser.parseWARC())
  parser = new WARCParser()
  t.throws(() => parser.start())
  t.throws(() => parser.parseWARC())
})
