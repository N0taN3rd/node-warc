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
const {
  WARCInfoRecord,
  WARCMetaDataRecord,
  WARCRequestRecord,
  WARCResponseRecord,
  WARCRevisitRecord,
  WARCUnknownRecord,
  WARCResourceRecord
} = require('../warcRecords')
/** @ignore */
const warcFieldIdentifiers = require('./fieldIdentifiers')

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
     * @type {?Map}
     * @private
     */
    this._info = null

    /**
     * @type {?Map}
     * @private
     */
    this._mdata = null

    /**
     * @type {?Map}
     * @private
     */
    this._req = null

    /**
     * @type {?Map}
     * @private
     */
    this._res = null

    /**
     * @type {?Map}
     * @private
     */
    this._rev = null

    /**
     * @type {?Map}
     * @private
     */
    this._resource = null

    /**
     * @type {?Map}
     * @private
     */
    this._unkown = null
  }

  /**
   * @desc determine the WARC-Type for the record
   * @param {Buffer} line the WARC-Type line
   * @param {Buffer} lastBegin the WARC/1.0 line (WARC record begin)
   * @return {Symbol} the record key that identifies the WARC-Type being parsed
   * @public
   */
  determineWarcType (line, lastBegin) {
    let foundType = warcFieldIdentifiers.req.equals(line)
    if (foundType) {
      return this.initReq(lastBegin, line)
    } else {
      foundType = warcFieldIdentifiers.res.equals(line)
      if (foundType) {
        return this.initRes(lastBegin, line)
      } else {
        foundType = warcFieldIdentifiers.revisit.equals(line)
        if (foundType) {
          return this.initRevist(lastBegin, line)
        } else {
          foundType = warcFieldIdentifiers.info.equals(line)
          if (foundType) {
            return this.initInfo(lastBegin, line)
          } else {
            foundType = warcFieldIdentifiers.mdata.equals(line)
            if (foundType) {
              return this.initMdata(lastBegin, line)
            } else {
              foundType = warcFieldIdentifiers.resource.equals(line)
              if (foundType) {
                return this.initResource(lastBegin, line)
              }
              // console.log('unknown warc type', line, line.toString())
              return this.initUnknown(lastBegin, line)
            }
          }
        }
      }
    }
  }

  /**
   * @desc Begin building WARC-TYPE: warcinfo
   * @param {Buffer} bgn the WARC/1.0 line
   * @param {Buffer} line the WARC-TYPE line
   * @return {Symbol} the internal record key for the warcinfo record currently being built
   */
  initInfo (bgn, line) {
    if (this._info === null) {
      this._info = new Map()
    }
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
    if (this._mdata === null) {
      this._mdata = new Map()
    }
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
    if (this._req === null) {
      this._req = new Map()
    }
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
    if (this._res === null) {
      this._res = new Map()
    }
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
    if (this._rev === null) {
      this._rev = new Map()
    }
    this._rev.clear()
    this._rev.set('header', [bgn, line])
    this._rev.set('http', [])
    return builderKeyRev
  }

  /**
   * @desc Begin building WARC-TYPE: revisit
   * @param {Buffer} bgn the WARC/1.0 line
   * @param {Buffer} line the WARC-TYPE line
   * @return {Symbol} the internal record key for the revisit record currently being built
   */
  initUnknown (bgn, line) {
    if (this._unkown === null) {
      this._unkown = new Map()
    }
    this._unkown.clear()
    this._unkown.set('header', [bgn, line])
    return builderKeyUnknown
  }

  /**
   * @desc Begin building WARC-TYPE: resource
   * @param {Buffer} bgn the WARC/1.0 line
   * @param {Buffer} line the WARC-TYPE line
   * @return {Symbol} the internal record key for the resource record currently being built
   */
  initResource (bgn, line) {
    if (this._resource === null) {
      this._resource = new Map()
    }
    this._resource.clear()
    this._resource.set('header', [bgn, line])
    this._resource.set('content', [])
    return builderKeyResource
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
      case builderKeyResource:
        this._addResourceLine(ctrlfCount, line)
        break
      case builderKeyUnknown:
        this._addUnkownLine(ctrlfCount, line)
        break
    }
  }

  /**
   * @desc Build the record currently being parsed
   * @param {Symbol} key the internal record key for the response record currently being built exposed by
   * {@link initInfo}, {@link initMdata}, {@link initRes} and {@link initReq}
   * @return {WARCInfoRecord|WARCMetaDataRecord|WARCRequestRecord|WARCResponseRecord|WARCRevisitRecord|WARCUnknownRecord} based off the ``key`` supplied to
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
      case builderKeyResource:
        record = new WARCResourceRecord(...this._resource.values())
        this._resource.clear()
        break
      case builderKeyUnknown:
        record = this._attemptCorrection()
        this._unkown.clear()
        break
    }
    return record
  }

  _attemptCorrection () {
    let headers = this._unkown.get('header')
    let len = headers.length
    let i = 0
    for (; i < len; ++i) {
      if (warcFieldIdentifiers.req.equals(headers[i])) {
        return new WARCRequestRecord(...this._unkown.values())
      }

      if (warcFieldIdentifiers.res.equals(headers[i])) {
        return new WARCResponseRecord(...this._unkown.values())
      }

      if (warcFieldIdentifiers.info.equals(headers[i])) {
        return new WARCInfoRecord(...this._unkown.values())
      }

      if (warcFieldIdentifiers.revisit.equals(headers[i])) {
        return new WARCRevisitRecord(...this._unkown.values())
      }

      if (warcFieldIdentifiers.mdata.equals(headers[i])) {
        return new WARCMetaDataRecord(...this._unkown.values())
      }

      if (warcFieldIdentifiers.resource.equals(headers[i])) {
        return new WARCResourceRecord(...this._unkown.values())
      }
    }

    // console.log('found nothing', this._unkown)
    // ;[...this._unkown.values()].forEach(it => {
    //   it.forEach(it2 => {
    //     console.log(it2.toString())
    //   })
    //   console.log('--------------')
    // })
    return new WARCUnknownRecord(...this._unkown.values())
  }

  /**
   * @desc Clears the builders internals. Do not call this functions unless parsing has completely finished
   * this will completely remove all information pertaining to building of the current WARC Record.
   * This method is intended to be used by the WARC parsers.
   */
  clear () {
    if (this._info) {
      this._info.clear()
    }
    if (this._mdata) {
      this._mdata.clear()
    }
    if (this._req) {
      this._req.clear()
    }
    if (this._res) {
      this._res.clear()
    }
    if (this._rev) {
      this._rev.clear()
    }
    if (this._resource) {
      this._resource.clear()
    }
    if (this._unkown) {
      this._unkown.clear()
    }
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

  /**
   * @desc Adds the line to the correct section for an ``unknown`` record
   * @param {number} ctrlfCount the current count of Control LineFeeds between WARC Record parts
   * @param {Buffer} line the current line being parsed
   * @private
   */
  _addUnkownLine (ctrlfCount, line) {
    if (ctrlfCount === 0) {
      this._unkown.get('header').push(line)
    } else {
      if (!this._unkown.has(ctrlfCount)) {
        this._unkown.set(ctrlfCount, [])
      }
      this._unkown.get(ctrlfCount).push(line)
    }
  }

  /**
   * @desc Adds the line to the correct WARC record section for resource
   * @param {number} ctrlfCount the current count of Control LineFeeds between WARC Record parts
   * @param {Buffer} line the current line being parsed
   * @private
   */
  _addResourceLine (ctrlfCount, line) {
    if (ctrlfCount === 0) {
      this._resource.get('header').push(line)
    } else if (ctrlfCount === 1) {
      this._resource.get('content').push(line)
    }
  }
}

module.exports = WARCRecorderBuilder
