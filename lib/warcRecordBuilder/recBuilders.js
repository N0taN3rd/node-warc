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
const WFI = require('./fieldIdentifiers')

class InfoBuilder {
  constructor () {
    this.header = []
    this.content = []
  }

  /**
   *
   * @param {Buffer} bgn
   * @param {Buffer} line
   * @return {Symbol}
   */
  init (bgn, line) {
    this.header.push(bgn, line)
    return builderKeyInfo
  }

  /**
   *
   * @param {number} ctrlfCount
   * @param {Buffer} line
   */
  addLine (ctrlfCount, line) {
    if (ctrlfCount === 0) {
      this.header.push(line)
    } else if (ctrlfCount === 1) {
      this.content.push(line)
    }
  }

  /**
   *
   * @return {WARCInfoRecord}
   */
  buildRecord () {
    const record = new WARCInfoRecord(this.header, this.content)
    this.header = []
    this.content = []
    return record
  }
}

class MetadataBuilder {
  constructor () {
    this.header = []
    this.content = []
  }

  /**
   *
   * @param {Buffer} bgn
   * @param {Buffer} line
   * @return {Symbol}
   */
  init (bgn, line) {
    this.header.length = 0
    this.content.length = 0
    this.header.push(bgn, line)
    return builderKeyMdata
  }

  /**
   *
   * @param {number} ctrlfCount
   * @param {Buffer} line
   */
  addLine (ctrlfCount, line) {
    if (ctrlfCount === 0) {
      this.header.push(line)
    } else if (ctrlfCount === 1) {
      this.content.push(line)
    }
  }

  /**
   *
   * @return {WARCMetaDataRecord}
   */
  buildRecord () {
    return new WARCMetaDataRecord(this.header, this.content)
  }
}

class RequestBuilder {
  constructor () {
    this.header = []
    this.http = []
    this.post = []
  }

  /**
   *
   * @param {Buffer} bgn
   * @param {Buffer} line
   * @return {Symbol}
   */
  init (bgn, line) {
    this.header.push(bgn, line)
    return builderKeyReq
  }

  /**
   *
   * @param {number} ctrlfCount
   * @param {Buffer} line
   */
  addLine (ctrlfCount, line) {
    if (ctrlfCount === 0) {
      this.header.push(line)
    } else if (ctrlfCount === 1) {
      this.http.push(line)
    } else if (ctrlfCount === 2) {
      this.post.push(line)
    }
  }

  /**
   *
   * @return {WARCRequestRecord}
   */
  buildRecord () {
    const record = new WARCRequestRecord(this.header, this.http, this.post)
    this.header = []
    this.http = []
    this.post = []
    return record
  }
}

class ResponseBuilder {
  constructor () {
    this.header = []
    this.http = []
    this.body = []
  }

  /**
   *
   * @param {Buffer} bgn
   * @param {Buffer} line
   * @return {Symbol}
   */
  init (bgn, line) {
    this.header.push(bgn, line)
    return builderKeyRes
  }

  /**
   *
   * @param {number} ctrlfCount
   * @param {Buffer} line
   */
  addLine (ctrlfCount, line) {
    if (ctrlfCount === 0) {
      this.header.push(line)
    } else if (ctrlfCount === 1) {
      this.http.push(line)
    } else if (ctrlfCount === 2) {
      this.body.push(line)
    }
  }

  /**
   * @return {WARCResponseRecord}
   */
  buildRecord () {
    const record = new WARCResponseRecord(this.header, this.http, this.body)
    this.header = []
    this.http = []
    this.body = []
    return record
  }
}

class RevisitBuilder {
  constructor () {
    this.header = []
    this.http = []
  }

  /**
   *
   * @param {Buffer} bgn
   * @param {Buffer} line
   * @return {Symbol}
   */
  init (bgn, line) {
    this.header.push(bgn, line)
    return builderKeyRev
  }

  /**
   *
   * @param {number} ctrlfCount
   * @param {Buffer} line
   */
  addLine (ctrlfCount, line) {
    if (ctrlfCount === 0) {
      this.header.push(line)
    } else if (ctrlfCount === 1) {
      this.http.push(line)
    }
  }

  /**
   * @return {WARCRevisitRecord}
   */
  buildRecord () {
    const record = new WARCRevisitRecord(this.header, this.http)
    this.header = []
    this.http = []
    return record
  }
}

class ResourceBuilder {
  constructor () {
    this.header = []
    this.content = []
  }

  /**
   *
   * @param {Buffer} bgn
   * @param {Buffer} line
   * @return {Symbol}
   */
  init (bgn, line) {
    this.header.push(bgn, line)
    return builderKeyResource
  }

  /**
   *
   * @param {number} ctrlfCount
   * @param {Buffer} line
   */
  addLine (ctrlfCount, line) {
    if (ctrlfCount === 0) {
      this.header.push(line)
    } else if (ctrlfCount === 1) {
      this.content.push(line)
    }
  }

  /**
   * @return {WARCResourceRecord}
   */
  buildRecord () {
    const record = new WARCResourceRecord(this.header, this.content)
    this.header = []
    this.content = []
    return record
  }
}

class UnKnownBuilder {
  constructor () {
    this.header = []
    this.rest = new Map()
  }

  /**
   *
   * @param {Buffer} bgn
   * @param {Buffer} line
   * @return {Symbol}
   */
  init (bgn, line) {
    this.header.push(bgn, line)
    return builderKeyUnknown
  }

  /**
   *
   * @param {number} ctrlfCount
   * @param {Buffer} line
   */
  addLine (ctrlfCount, line) {
    if (ctrlfCount === 0) {
      this.header.push(line)
    } else {
      let atCount = this.rest.get(ctrlfCount)
      if (!atCount) {
        atCount = []
        this.rest.set(ctrlfCount, atCount)
      }
      atCount.push(line)
    }
  }

  /**
   * @return {WARCRequestRecord | WARCResponseRecord | WARCRevisitRecord | WARCResourceRecord | WARCMetaDataRecord | WARCMetaDataRecord}
   */
  buildRecord () {
    let len = this.header.length
    let i = 0
    let record
    while (i < len) {
      if (WFI.req.equals(this.header[i])) {
        record = new WARCRequestRecord(this.header, this.rest.get(1), this.rest.get(2))
        break
      }

      if (WFI.res.equals(this.header[i])) {
        record = new WARCResponseRecord(this.header, this.rest.get(1), this.rest.get(2))
        break
      }

      if (WFI.info.equals(this.header[i])) {
        record = new WARCInfoRecord(this.header, this.rest.get(1))
        break
      }

      if (WFI.revisit.equals(this.header[i])) {
        record = new WARCRevisitRecord(this.header, this.rest.get(1))
        break
      }

      if (WFI.mdata.equals(this.header[i])) {
        record = new WARCMetaDataRecord(this.header, this.rest.get(1))
        break
      }

      if (WFI.resource.equals(this.header[i])) {
        record = new WARCResourceRecord(this.header, this.rest.get(1))
        break
      }
      i++
    }
    if (!record) {
      record = new WARCUnknownRecord(this.header, ...this.rest.values())
    }
    this.header = []
    this.rest.clear()
    return record
  }
}

/**
 * @param {Symbol} builderSymbol
 * @return {InfoBuilder | MetadataBuilder | RequestBuilder | ResponseBuilder | RevisitBuilder | ResourceBuilder | UnKnownBuilder}
 */
function newBuilder (builderSymbol) {
  switch (builderSymbol) {
    case builderKeyInfo:
      return new InfoBuilder()
    case builderKeyMdata:
      return new MetadataBuilder()
    case builderKeyReq:
      return new RequestBuilder()
    case builderKeyRes:
      return new ResponseBuilder()
    case builderKeyRev:
      return new RevisitBuilder()
    case builderKeyResource:
      return new ResourceBuilder()
    case builderKeyUnknown:
      return new UnKnownBuilder()
  }
}

module.exports = {
  InfoBuilder,
  RequestBuilder,
  ResourceBuilder,
  ResponseBuilder,
  RevisitBuilder,
  UnKnownBuilder,
  MetadataBuilder,
  newBuilder
}
