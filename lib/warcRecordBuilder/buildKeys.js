/**
 * @desc Keys used by {@link WARCRecorderBuilder} to identify which WARC Record is currently being built
 * @type {{builderKeyInfo: Symbol, builderKeyMdata: Symbol, builderKeyReq: Symbol, builderKeyRes: Symbol}}
 */
const buildKeys = {
  builderKeyInfo: Symbol('info'),
  builderKeyMdata: Symbol('mdata'),
  builderKeyReq: Symbol('req'),
  builderKeyRes: Symbol('res')
}

module.exports = buildKeys
