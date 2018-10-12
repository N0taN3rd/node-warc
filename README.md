# node-warc
Parse Web Archive (WARC) files or create WARC files using [Electron](https://electron.atom.io/) or [chrome-remote-interface](https://github.com/cyrus-and/chrome-remote-interface)

Run `npm install node-warc` or `yarn add node-warc` to ge started


[![npm Package](https://img.shields.io/npm/v/node-warc.svg?style=flat-square)](https://www.npmjs.com/package/node-warc)

## API
Full API documentation available at [n0tan3rd.github.io/node-warc](https://n0tan3rd.github.io/node-warc/)

## Example usage

### Example 1: Both ``.warc`` and ``.warc.gz``
```js
const AutoWARCParser = require('node-warc')

const parser = new AutoWARCParser('<path-to-warcfile>')
parser.on('record', record => { console.log(record) })
parser.on('done', finalRecord => { console.log(finalRecord) })
parser.on('error', error => { console.error(error) })
parser.start()
```

### Example 2: Only ``.warc.gz``
```js
const WARCGzParser = require('node-warc').WARCGzParser

const parser = new WARCGzParser('<path-to-warcfile>')
parser.on('record', record => { console.log(record) })
parser.on('done', finalRecord => { console.log(finalRecord) })
parser.on('error', error => { console.error(error) })
parser.start()
```

### Example 3: Only ``.warc``
```js
const WARCParser = require('node-warc').WARCParser

const parser = new WARCParser('<path-to-warcfile>')
parser.on('record', record => { console.log(record) })
parser.on('done', finalRecord => { console.log(finalRecord) })
parser.on('error', error => { console.error(error) })
parser.start()
```

## Benchmark 

#### UN-GZIPPED 
- 145.9MB (8,026 records) took 2s. Max node process usage 22 MiB 
- 268MB (852 records) took 2s. Max node process usage  77 MiB
- 2GB (76,980 records) took 21s. Max node process usage 100 MiB
- 4.8GB (185,662 records) took 1m. Max node process usage 144.3 MiB

#### GZIPPED
- 7.7MB (1,269 records) took 297ms. Max node process memory usage 7.1 MiB
- 819.1MB (34,253 records) took 16s. Max node process memory usage 190.3 MiB
- 2.3GB (68,020 records) took 45s. Max node process memory usage 197.6 MiB
- 5.3GB (269,464 records) took 4m. Max node process memory usage 198.2 MiB

[![JavaScript Style Guide](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)

## Environment
* `NODEWARC_WRITE_GZIPPED` - writes gzipped records to WARC outputs.