const CE = {
  upper: 'Content-Encoding',
  lower: 'content-encoding',
  re: /Content-Encoding:\s(.*)\r\n/gi
}

function getContentEncoding (headers, headersText) {
  if (headers) {
    if (headers[CE.upper]) {
      return headers[CE.upper]
    } else if (headers[CE.lower]) {
      return headers[CE.lower]
    } else if (headersText) {
      return CE.re.exec(headersText)
    }
  } else if (headersText) {
    return CE.re.exec(headersText)
  }

  return undefined
}

module.exports = getContentEncoding
