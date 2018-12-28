/**
 * @type {RegExp}
 */
const warcRE = /.*([.]warc)([.]gz)?/

/**
 * @desc Ensure that the supplied name for the WARC is correct
 * @param {string?} filename
 * @param {boolean} [gzipping = false]
 * @return {string}
 */
module.exports = function ensureWARCFilename (filename, gzipping = false) {
  if (filename == null) {
    const was = filename === undefined ? 'undefined' : 'null'
    throw new Error(`The supplied WARC filename was "${was}", expecting a string`)
  }
  if (typeof filename !== 'string') {
    throw new Error(`The supplied WARC filename was not a string it was "${typeof filename}"`)
  }
  // get the match
  const match = warcRE.exec(filename)
  if (!match) {
    // no warc or warc.gz ext correct that
    return `${filename}.warc${gzipping ? '.gz' : ''}`
  }
  // early out for non-gzipped warc (ends with .warc and but not .gz)
  if (!gzipping && match[1] != null && match[2] == null) return filename
  // early out for gzipped warc (ends with both .warc and .gz)
  if (gzipping && match[1] != null && match[2] != null) return filename
  // the remaining checks are just to be 100% sure the file extension issue was corrected
  const hasWARC = match[1] != null
  const hasWARCGZ = match[2] != null
  if (gzipping) {
    // filesname does not end with .warc.gz
    if (!hasWARC) return `${filename}.warc.gz`
    // filename ends with .warc but not .gz
    if (!hasWARCGZ) return `${filename}.gz`
  } else if (!hasWARC) {
    // filename does not end with .warc but why we are here I do not know
    return `${filename}.warc`
  }
  // wat??
  return filename
}
