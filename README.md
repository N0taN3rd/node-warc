# node-warc
Parse Web ARChive  (WARC) files with node.js. 

* This project is currently under active development but does not support parsing of warc.gz at the moment. master@[9397341](https://github.com/N0taN3rd/node-warc/commit/93973417b648045549db3784df0889d8e28ae4c7)      

## Example usage

### Example 1
```js
const WARCParse = require('node-warc')

const parser = new WARCParser('<path-to-warcfile>')
parser.on('record', record => { console.log(record) })
parser.on('done', finalRecord => { console.log(finalRecord) })
parser.on('error', error => { console.error(error) })
parser.start()
```

### Example 2
```js
const WARCParse = require('node-warc')

const parser = new WARCParser()
parser.on('record', record => { console.log(record) })
parser.on('done', finalRecord => { console.log(finalRecord) })
parser.on('error', error => { console.error(error) })
parser.parseWARC('<path-to-warcfile>')
```

## API
Documentation available at [n0tan3rd.github.io/node-warc](https://n0tan3rd.github.io/node-warc/)

## Benchmark
Parsing 145.9MB UN-GZIPPED WARC took 2s.  Node process memory usage 27.2mb

Parsing 2GB UN-GZIPPED WARC took 21s. Node process memory usage 85mb


[![JavaScript Style Guide](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)
