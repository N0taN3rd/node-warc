/**
 * @type {{WARCRecord: WARCRecord, RecordBuilder: RecordBuilder, ContentParser: ContentParser}}
 */
module.exports = {
  /**
   * @type {WARCRecord}
   */
  WARCRecord: require('./record'),

  /**
   * @type {RecordBuilder}
   */
  RecordBuilder: require('./builder'),

  /**
   * @type {ContentParser}
   */
  ContentParser: require('./warcContentParsers')
}
