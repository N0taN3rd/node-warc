const warcHeader = ({now, fileName, rid, len}) => `WARC/1.0\r
WARC-Type: warcinfo\r
WARC-Date: ${now}\r
WARC-Filename: ${fileName}\r
WARC-Record-ID: <urn:uuid:${rid}>\r
Content-Type: application/warc-fields\r
Content-Length: ${len}\r\n`

const warcHeaderContent = ({version, isPartOfV, warcInfoDescription, ua}) => `software: node-warc/${version}\r
format: WARC File Format 1.0\r
conformsTo: http://bibnum.bnf.fr/WARC/WARC_ISO_28500_version1_latestdraft.pdf\r
isPartOf: ${isPartOfV}\r
description: ${warcInfoDescription}\r
robots: ignore\r
http-header-user-agent: ${ua}\r\n`

const warcMetadataHeader = ({targetURI, now, concurrentTo, rid, len, wid}) => `WARC/1.0\r
WARC-Type: metadata\r
WARC-Target-URI: ${targetURI}\r
WARC-Date: ${now}\r
WARC-Concurrent-To: <urn:uuid:${concurrentTo}>\r
WARC-Record-ID: <urn:uuid:${rid}>\r\
${wid ? `\nWARC-Warcinfo-ID: <urn:uuid:${wid}>\r` : ''}
Content-Type: application/warc-fields\r
Content-Length: ${len}\r\n`

const warcRequestHeader = ({targetURI, now, concurrentTo, rid, len, wid}) => `WARC/1.0\r
WARC-Type: request\r
WARC-Target-URI: ${targetURI}\r
WARC-Date: ${now}\r
WARC-Concurrent-To: <urn:uuid:${concurrentTo}>\r
WARC-Record-ID: <urn:uuid:${rid}>\r\
${wid ? `\nWARC-Warcinfo-ID: <urn:uuid:${wid}>\r` : ''}
Content-Type: application/http; msgtype=request\r
Content-Length: ${len}\r\n`

const warcResponseHeader = ({targetURI, now, rid, len, wid}) => `WARC/1.0\r
WARC-Type: response\r
WARC-Target-URI: ${targetURI}\r
WARC-Date: ${now}\r
WARC-Record-ID: <urn:uuid:${rid}>\r\
${wid ? `\nWARC-Warcinfo-ID: <urn:uuid:${wid}>\r` : ''}
Content-Type: application/http; msgtype=response\r
Content-Length: ${len}\r\n`

const CRLF = '\r\n'
const recordSeparator = `${CRLF}${CRLF}`

const warcFields = {
  warcHeader,
  warcHeaderContent,
  warcRequestHeader,
  warcResponseHeader,
  warcMetadataHeader,
  recordSeparator,
  CRLF
}

module.exports = warcFields
