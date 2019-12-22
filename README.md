# node-warc
Parse Web Archive (WARC) files or create WARC files using 
 - [chrome-remote-interface](https://github.com/cyrus-and/chrome-remote-interface)
 - [chrome-remote-interface-extra](https://github.com/N0taN3rd/chrome-remote-interface-extra) 
 - [Puppeteer](https://github.com/GoogleChrome/puppeteer)
 - [Electron](https://electron.atom.io/)
 - [request](https://github.com/request/request)


Run `npm install node-warc` or `yarn add node-warc` to ge started

[![npm Package](https://img.shields.io/npm/v/node-warc.svg?style=flat-square)](https://www.npmjs.com/package/node-warc)

## Documentation
Full documentation available at [n0tan3rd.github.io/node-warc](https://n0tan3rd.github.io/node-warc/)

## Parsing

### Using async iteration
**Requires node 10 or greater**
```js
const fs = require('fs')
const zlib = require('zlib')
// recordIterator only exported if async iteration on readable streams is available
const { recordIterator } = require('node-warc')

async function iterateRecords (warcStream) {
  for await (const record of recordIterator(warcStream)) {
    console.log(record)
  }
}

iterateRecords(
  fs.createReadStream('<path-to-gzipd-warcfile>').pipe(zlib.createGunzip())
).then(() => {
  console.log('done')
})
```

Or using one of the parsers
```js
for await (const record of new AutoWARCParser('<path-to-warcfile>')) {
    console.log(record)
}
```

### Using Stream Transform
```js
const fs = require('fs')
const { WARCStreamTransform } = require('node-warc')

fs
  .createReadStream('<path-to-warcfile>')
  .pipe(new WARCStreamTransform())
  .on('data', record => {
    console.log(record)
  })
```

### Both ``.warc`` and ``.warc.gz``
```js
const { AutoWARCParser } = require('node-warc')

const parser = new AutoWARCParser('<path-to-warcfile>')
parser.on('record', record => { console.log(record) })
parser.on('done', () => { console.log('finished') })
parser.on('error', error => { console.error(error) })
parser.start()
```

### Only gzip'd warc files
```js
const { WARCGzParser } = require('node-warc')

const parser = new WARCGzParser('<path-to-warcfile>')
parser.on('record', record => { console.log(record) })
parser.on('done', () => { console.log('finished') })
parser.on('error', error => { console.error(error) })
parser.start()
```

### Only non gzip'd warc files
```js
const { WARCGzParser } = require('node-warc')

const parser = new WARCParser('<path-to-gzipd-warcfile>')
parser.on('record', record => { console.log(record) })
parser.on('done', () => { console.log('finished') })
parser.on('error', error => { console.error(error) })
parser.start()
```

## WARC Creation 

### Environment
* `NODEWARC_WRITE_GZIPPED` - enable writing gzipped records to WARC outputs.

### Examples

#### Using [chrome-remote-interface](https://github.com/cyrus-and/chrome-remote-interface)

```js
const CRI = require('chrome-remote-interface')
const { RemoteChromeWARCGenerator, RemoteChromeCapturer } = require('node-warc')

;(async () => {
  const client = await CRI()
  await Promise.all([
    client.Page.enable(),
    client.Network.enable(),
  ])
  const cap = new RemoteChromeCapturer(client.Network)
  cap.startCapturing()
  await client.Page.navigate({ url: 'http://example.com' });
  // actual code should wait for a better stopping condition, eg. network idle
  await client.Page.loadEventFired()
  const warcGen = new RemoteChromeWARCGenerator()
  await warcGen.generateWARC(cap, client.Network, {
    warcOpts: {
      warcPath: 'myWARC.warc'
    },
    winfo: {
      description: 'I created a warc!',
      isPartOf: 'My awesome pywb collection'
    }
  })
  await client.close()
})()
```

#### Using [chrome-remote-interface-extra](https://github.com/N0taN3rd/chrome-remote-interface-extra) 
```js
const { CRIExtra, Events, Page } = require('chrome-remote-interface-extra')
const { CRIExtraWARCGenerator, CRIExtraCapturer } = require('node-warc')

;(async () => {
  let client
  try {
    // connect to endpoint
    client = await CRIExtra({ host: 'localhost', port: 9222 })
    const page = await Page.create(client)
    const cap = new CRIExtraCapturer(page, Events.Page.Request)
    cap.startCapturing()
    await page.goto('https://example.com', { waitUntil: 'networkidle0' })
    const warcGen = new CRIExtraWARCGenerator()
    await warcGen.generateWARC(cap, {
      warcOpts: {
        warcPath: 'myWARC.warc'
      },
      winfo: {
        description: 'I created a warc!',
        isPartOf: 'My awesome pywb collection'
      }
    })
  } catch (err) {
    console.error(err)
  } finally {
    if (client) {
      await client.close()
    }
  }
})()
```

#### Using [Puppeteer](https://github.com/GoogleChrome/puppeteer)
```js
const puppeteer = require('puppeteer')
const { Events } = require('puppeteer')
const { PuppeteerWARCGenerator, PuppeteerCapturer } = require('node-warc')

;(async () => {
  const browser = await puppeteer.launch()
  const page = await browser.newPage()
  const cap = new PuppeteerCapturer(page, Events.Page.Request)
  cap.startCapturing()
  await page.goto('http://example.com', { waitUntil: 'networkidle0' })
  const warcGen = new PuppeteerWARCGenerator()
  await warcGen.generateWARC(cap, {
    warcOpts: {
      warcPath: 'myWARC.warc'
    },
    winfo: {
      description: 'I created a warc!',
      isPartOf: 'My awesome pywb collection'
    }
  })
  await page.close()
  await browser.close()
})()
```

#### Note
The generateWARC method used in the preceding examples is helper function for making 
the WARC generation process simple. See its implementation for a full example 
of WARC generation using node-warc

Or see one of the crawler implementations provided by [Squidwarc](https://github.com/N0taN3rd/Squidwarc/tree/master/lib/crawler).
