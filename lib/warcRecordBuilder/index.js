/** @ignore */
const {builderKeyInfo, builderKeyMdata, builderKeyReq, builderKeyRes, builderKeyRev} = require('./buildKeys')
/** @ignore */
const {WARCInfoRecord, WARCMetaDataRecord, WARCRequestRecord, WARCResponseRecord, WARCRevisitRecord} = require('../warcRecords')

/**
 * @desc Builds WARC Records by keeping track internally of the current WARC Record WARC-TYPE being parsed
 * by a parser e.g. {@link WARCGzParser}
 */
class WARCRecorderBuilder {
  /**
   * @desc Construct a new WARCRecorderBuilder
   */
  constructor () {
    this._info = new Map()
    this._mdata = new Map()
    this._req = new Map()
    this._res = new Map()
    this._rev = new Map()
  }

  /**
   * @desc Begin building WARC-TYPE: warcinfo
   * @param {Buffer} bgn the WARC/1.0 line
   * @param {Buffer} line the WARC-TYPE line
   * @return {Symbol} the internal record key for the warcinfo record currently being built
   */
  initInfo (bgn, line) {
    this._info.clear()
    this._info.set('header', [bgn, line])
    this._info.set('content', [])
    return builderKeyInfo
  }

  /**
   * @desc Begin building WARC-TYPE: metadata
   * @param {Buffer} bgn the WARC/1.0 line
   * @param {Buffer} line the WARC-TYPE line
   * @return {Symbol} the internal record key for the metadata record currently being built
   */
  initMdata (bgn, line) {
    this._mdata.clear()
    this._mdata.set('header', [bgn, line])
    this._mdata.set('content', [])
    return builderKeyMdata
  }

  /**
   * @desc Begin building WARC-TYPE: request
   * @param {Buffer} bgn the WARC/1.0 line
   * @param {Buffer} line the WARC-TYPE line
   * @return {Symbol} the internal record key for the request record currently being built
   */
  initReq (bgn, line) {
    this._req.clear()
    this._req.set('header', [bgn, line])
    this._req.set('http', [])
    this._req.set('post', [])
    return builderKeyReq
  }

  /**
   * @desc Begin building WARC-TYPE: response
   * @param {Buffer} bgn the WARC/1.0 line
   * @param {Buffer} line the WARC-TYPE line
   * @return {Symbol} the internal record key for the response record currently being built
   */
  initRes (bgn, line) {
    this._res.clear()
    this._res.set('header', [bgn, line])
    this._res.set('http', [])
    this._res.set('body', [])
    return builderKeyRes
  }

  /**
   * @desc Begin building WARC-TYPE: revisit
   * @param {Buffer} bgn the WARC/1.0 line
   * @param {Buffer} line the WARC-TYPE line
   * @return {Symbol} the internal record key for the revisit record currently being built
   */
  initRevist (bgn, line) {
    this._rev.clear()
    this._rev.set('header', [bgn, line])
    this._rev.set('http', [])
    return builderKeyRev
  }

  /**
   * @desc Add the current line being parsed to a record currently being built
   * @param {Symbol} key the internal record key for the response record currently being built exposed by
   * {@link initInfo}, {@link initMdata}, {@link initRes} and {@link initReq}
   * @param {number} ctrlfCount the current count of Control LineFeeds between WARC Record parts
   * @param {Buffer} line the current line being parsed
   */
  addLineTo (key, ctrlfCount, line) {
    switch (key) {
      case builderKeyInfo:
        this._addInfoLine(ctrlfCount, line)
        break
      case builderKeyMdata:
        this._addMdataLine(ctrlfCount, line)
        break
      case builderKeyReq:
        this._addReqLine(ctrlfCount, line)
        break
      case builderKeyRes:
        this._addResLine(ctrlfCount, line)
        break
      case builderKeyRev:
        this._addRevLine(ctrlfCount, line)
        break
    }
  }

  /**
   * @desc Build the record currently being parsed
   * @param {Symbol} key the internal record key for the response record currently being built exposed by
   * {@link initInfo}, {@link initMdata}, {@link initRes} and {@link initReq}
   * @return {WARCInfoRecord|WARCMetaDataRecord|WARCRequestRecord|WARCResponseRecord|WARCRevisitRecord} based off the ``key`` supplied to
   * this method
   */
  buildRecord (key) {
    let record
    switch (key) {
      case builderKeyInfo:
        record = new WARCInfoRecord(...this._info.values())
        this._info.clear()
        break
      case builderKeyMdata:
        record = new WARCMetaDataRecord(...this._mdata.values())
        this._mdata.clear()
        break
      case builderKeyReq:
        record = new WARCRequestRecord(...this._req.values())
        this._req.clear()
        break
      case builderKeyRes:
        record = new WARCResponseRecord(...this._res.values())
        this._res.clear()
        break
      case builderKeyRev:
        record = new WARCRevisitRecord(...this._rev.values())
        this._rev.clear()
        break
    }
    return record
  }

  /**
   * @desc Clears the builders internals. Do not call this functions unless parsing has completely finished
   * this will completely remove all information pertaining to building of the current WARC Record.
   * This method is intended to be used by the WARC parsers.
   */
  clear () {
    this._info.clear()
    this._mdata.clear()
    this._req.clear()
    this._res.clear()
    this._rev.clear()
  }

  /**
   * @desc Adds the line to the correct WARC record section for warcinfo
   * @param {number} ctrlfCount the current count of Control LineFeeds between WARC Record parts
   * @param {Buffer} line the current line being parsed
   * @private
   */
  _addInfoLine (ctrlfCount, line) {
    if (ctrlfCount === 0) {
      this._info.get('header').push(line)
    } else if (ctrlfCount === 1) {
      this._info.get('content').push(line)
    }
  }

  /**
   * @desc Adds the line to the correct WARC record section for metadata
   * @param {number} ctrlfCount the current count of Control LineFeeds between WARC Record parts
   * @param {Buffer} line the current line being parsed
   * @private
   */
  _addMdataLine (ctrlfCount, line) {
    if (ctrlfCount === 0) {
      this._mdata.get('header').push(line)
    } else if (ctrlfCount === 1) {
      this._mdata.get('content').push(line)
    }
  }

  /**
   * @desc Adds the line to the correct WARC record section for request
   * @param {number} ctrlfCount the current count of Control LineFeeds between WARC Record parts
   * @param {Buffer} line the current line being parsed
   * @private
   */
  _addReqLine (ctrlfCount, line) {
    if (ctrlfCount === 0) {
      this._req.get('header').push(line)
    } else if (ctrlfCount === 1) {
      this._req.get('http').push(line)
    } else if (ctrlfCount === 2) {
      this._req.get('post').push(line)
    }
  }

  /**
   * @desc Adds the line to the correct WARC record section for response
   * @param {number} ctrlfCount the current count of Control LineFeeds between WARC Record parts
   * @param {Buffer} line the current line being parsed
   * @private
   */
  _addResLine (ctrlfCount, line) {
    if (ctrlfCount === 0) {
      this._res.get('header').push(line)
    } else if (ctrlfCount === 1) {
      this._res.get('http').push(line)
    } else if (ctrlfCount === 2) {
      this._res.get('body').push(line)
    }
  }

  /**
   * @desc Adds the line to the correct WARC record section for revisit
   * @param {number} ctrlfCount the current count of Control LineFeeds between WARC Record parts
   * @param {Buffer} line the current line being parsed
   * @private
   */
  _addRevLine (ctrlfCount, line) {
    if (ctrlfCount === 0) {
      this._rev.get('header').push(line)
    } else if (ctrlfCount === 1) {
      this._rev.get('http').push(line)
    }
  }
}

module.exports = WARCRecorderBuilder
