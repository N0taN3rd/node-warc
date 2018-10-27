# node-warc
Parse Web Archive (WARC) files or create WARC files using [Electron](https://electron.atom.io/), [chrome-remote-interface](https://github.com/cyrus-and/chrome-remote-interface), or [Puppeteer](https://github.com/GoogleChrome/puppeteer)

Run `npm install node-warc` or `yarn add node-warc` to ge started

[![npm Package](https://img.shields.io/npm/v/node-warc.svg?style=flat-square)](https://www.npmjs.com/package/node-warc)

## Documentation
Full documentation available at [n0tan3rd.github.io/node-warc](https://n0tan3rd.github.io/node-warc/)

## Example parsing usage


### Using async iteration
**Requires node 10 or greater**
```js
const fs = require('fs')
const zlib = require('zlib')
// require only available if async iteration on readable streams is available
const recordIterator = require('node-warc/recordterator')

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
  .createReadStream('someWARC.warc')
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

