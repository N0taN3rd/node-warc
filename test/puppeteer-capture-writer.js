import test from 'ava'
import * as fs from 'fs-extra'
import withPage from './helpers/puppeteerPage'
import PRC from '../lib/requestCapturers/puppeteer'
import PWG from '../lib/writers/puppeteer'
import recordterator from '../lib/parsers/recordterator'
import { homePageURLS } from './helpers/booksToScrape'
import { booksToScrapeWARC } from './helpers/filePaths'

async function recIterToArray (recordIter) {
  const recs = []
  for await (let it of recordIter) {
    recs.push(it)
  }
  return recs
}

test.serial(
  'Puppeteer Request Capturer Should Capture Requests',
  withPage,
  async (t, page) => {
    const capturer = new PRC(page)
    await page.goto('http://books.toscrape.com', { waitUntil: 'networkidle0' })
    t.true(
      capturer.requests().length >= 30,
      'The requests array should be greater than zero'
    )
    t.true(
      capturer.requests().every(r => homePageURLS.includes(r.url())),
      'All the requests of http://books.toscrape.com should have been captured'
    )
  }
)

test.serial(
  'Puppeteer WARC Generator Should Work',
  withPage,
  async (t, page) => {
    const capturer = new PRC(page)
    await page.goto('http://books.toscrape.com', { waitUntil: 'networkidle0' })
    await new PWG().generateWARC(capturer, {
      warcOpts: {
        warcPath: 'books.toscrape.warc'
      }
    })
    const generated = await recIterToArray(
      recordterator(fs.createReadStream('books.toscrape.warc'))
    )
    const expected = await recIterToArray(
      recordterator(fs.createReadStream(booksToScrapeWARC))
    )
    t.true(
      await fs.exists('books.toscrape.warc'),
      'The warc should have been generated'
    )
    t.true(
      generated.length === expected.length,
      'The generated warc record should have the same number of records'
    )
    try {
      for (let i = 0; i < generated.length; i++) {
        const grec = generated[i]
        const erec = expected[i]
        t.is(grec.warcType, erec.warcType)
        t.is(grec.warcTargetURI, erec.warcTargetURI)
      }
    } finally {
      await fs.remove('books.toscrape.warc')
    }
  }
)
