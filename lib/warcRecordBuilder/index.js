/** @ignore */
const {
  builderKeyInfo,
  builderKeyMdata,
  builderKeyReq,
  builderKeyRes,
  builderKeyRev,
  builderKeyResource,
  builderKeyUnknown
} = require('./buildKeys')
/** @ignore */
const { newBuilder } = require('./recBuilders')
const WFI = require('./fieldIdentifiers')

/**
 * @desc Builds WARC Records by keeping track internally of the current WARC Record WARC-TYPE being parsed
 * by a parser e.g. {@link WARCGzParser}
 */
class WARCRecorderBuilder {
  /**
   * @desc Construct a new WARCRecorderBuilder
   */
  constructor () {
    /**
     * @type {Map<Symbol, InfoBuilder | MetadataBuilder | RequestBuilder | ResponseBuilder | RevisitBuilder | ResourceBuilder | UnKnownBuilder>}
     */
    this.builders = new Map()
  }

  /**
   * @desc determine the WARC-Type for the record
   * @param {Buffer} line the WARC-Type line
   * @param {Buffer} lastBegin the WARC/1.0 line (WARC record begin)
   * @return {Symbol} the record key that identifies the WARC-Type being parsed
   * @public
   */
  determineWarcType (line, lastBegin) {
    if (line.length === 19) {
      if (WFI.req.equals(line)) {
        return this._init(builderKeyReq, lastBegin, line)
      } else {
        return this._init(builderKeyRev, lastBegin, line)
      }
    }
    let iDiffers = false
    let mDiffers = false
    let resDiffers = false
    let resoDiffers = false
    let same = 4
    let i = 11
    while (i < 20) {
      if (!iDiffers && WFI.info[i] !== line[i]) {
        iDiffers = true
        same -= 1
      }
      if (!mDiffers && WFI.mdata[i] !== line[i]) {
        mDiffers = true
        same -= 1
      }
      if (!resDiffers && WFI.res[i] !== line[i]) {
        resDiffers = true
        same -= 1
      }
      if (!resoDiffers && WFI.resource[i] !== line[i]) {
        resoDiffers = true
        same -= 1
      }
      if (same === 1) {
        break
      }
      i += 1
    }
    if (!iDiffers) {
      return this._init(builderKeyInfo, lastBegin, line)
    }
    if (!mDiffers) {
      return this._init(builderKeyMdata, lastBegin, line)
    }
    if (!resDiffers) {
      return this._init(builderKeyRes, lastBegin, line)
    }
    if (!resoDiffers) {
      return this._init(builderKeyResource, lastBegin, line)
    }
    return this._init(builderKeyUnknown, lastBegin, line)
  }

  /**
   *
   * @param {Symbol} key
   * @param {Buffer} bgn
   * @param {Buffer} line
   * @return {Symbol}
   * @private
   */
  _init (key, bgn, line) {
    let builder = this.builders.get(key)
    if (!builder) {
      builder = newBuilder(key)
      this.builders.set(key, builder)
    }
    return builder.init(bgn, line)
  }

  /**
   * @desc Begin building WARC-TYPE: warcinfo
   * @param {Buffer} bgn the WARC/1.0 line
   * @param {Buffer} line the WARC-TYPE line
   * @return {Symbol} the internal record key for the warcinfo record currently being built
   */
  initInfo (bgn, line) {
    let builder = this.builders.get(builderKeyInfo)
    if (!builder) {
      builder = newBuilder(key)
      this.builders.set(builderKeyInfo, builder)
    }
    return builder.init(bgn, line)
  }

  /**
   * @desc Begin building WARC-TYPE: metadata
   * @param {Buffer} bgn the WARC/X.X line
   * @param {Buffer} line the WARC-TYPE line
   * @return {Symbol} the internal record key for the metadata record currently being built
   */
  initMdata (bgn, line) {
    let builder = this.builders.get(builderKeyMdata)
    if (!builder) {
      builder = newBuilder(key)
      this.builders.set(builderKeyMdata, builder)
    }
    return builder.init(bgn, line)
  }

  /**
   * @desc Begin building WARC-TYPE: request
   * @param {Buffer} bgn the WARC/X.X line
   * @param {Buffer} line the WARC-TYPE line
   * @return {Symbol} the internal record key for the request record currently being built
   */
  initReq (bgn, line) {
    let builder = this.builders.get(builderKeyReq)
    if (!builder) {
      builder = newBuilder(key)
      this.builders.set(builderKeyReq, builder)
    }
    return builder.init(bgn, line)
  }

  /**
   * @desc Begin building WARC-TYPE: response
   * @param {Buffer} bgn the WARC/X.X line
   * @param {Buffer} line the WARC-TYPE line
   * @return {Symbol} the internal record key for the response record currently being built
   */
  initRes (bgn, line) {
    let builder = this.builders.get(builderKeyRes)
    if (!builder) {
      builder = newBuilder(key)
      this.builders.set(builderKeyRes, builder)
    }
    return builder.init(bgn, line)
  }

  /**
   * @desc Begin building WARC-TYPE: revisit
   * @param {Buffer} bgn the WARC/X.X line
   * @param {Buffer} line the WARC-TYPE line
   * @return {Symbol} the internal record key for the revisit record currently being built
   */
  initRevist (bgn, line) {
    let builder = this.builders.get(builderKeyRev)
    if (!builder) {
      builder = newBuilder(key)
      this.builders.set(builderKeyRev, builder)
    }
    return builder.init(bgn, line)
  }

  /**
   * @desc Begin building WARC-TYPE: revisit
   * @param {Buffer} bgn the WARC/X.X line
   * @param {Buffer} line the WARC-TYPE line
   * @return {Symbol} the internal record key for the revisit record currently being built
   */
  initUnknown (bgn, line) {
    let builder = this.builders.get(builderKeyUnknown)
    if (!builder) {
      builder = newBuilder(key)
      this.builders.set(builderKeyUnknown, builder)
    }
    return builder.init(bgn, line)
  }

  /**
   * @desc Begin building WARC-TYPE: resource
   * @param {Buffer} bgn the WARC/X.X line
   * @param {Buffer} line the WARC-TYPE line
   * @return {Symbol} the internal record key for the resource record currently being built
   */
  initResource (bgn, line) {
    let builder = this.builders.get(builderKeyResource)
    if (!builder) {
      builder = newBuilder(key)
      this.builders.set(builderKeyResource, builder)
    }
    return builder.init(bgn, line)
  }

  /**
   * @desc Add the current line being parsed to a record currently being built
   * @param {Symbol} key the internal record key for the response record currently being built exposed by
   * {@link initInfo}, {@link initMdata}, {@link initRes} and {@link initReq}
   * @param {number} ctrlfCount the current count of Control LineFeeds between WARC Record parts
   * @param {Buffer} line the current line being parsed
   */
  addLineTo (key, ctrlfCount, line) {
    this.builders.get(key).addLine(ctrlfCount, line)
  }

  /**
   * @desc Build the record currently being parsed
   * @param {Symbol} key the internal record key for the response record currently being built exposed by
   * {@link initInfo}, {@link initMdata}, {@link initRes} and {@link initReq}
   * @return {WARCInfoRecord|WARCMetaDataRecord|WARCRequestRecord|WARCResponseRecord|WARCRevisitRecord|WARCUnknownRecord} based off the ``key`` supplied to
   * this method
   */
  buildRecord (key) {
    return this.builders.get(key).buildRecord()
  }
}

module.exports = WARCRecorderBuilder
