export const crlfRe = /\r\n/g
export const idRe = /<urn:uuid:[0-9a-z]+-[0-9a-z]+-[0-9a-z]+-[0-9a-z]+-[0-9a-z]+>/
export const dateRe = /[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z/

export function parseKVContent (kvstring) {
  const parts = kvstring.split('\r\n')
  const parsed = {}
  for (let i = 0; i < parts.length; ++i) {
    let part = parts[i]
    if (part) {
      let sep = part.indexOf(': ')
      parsed[part.substring(0, sep)] = part.substring(sep + 2)
    }
  }
  return parsed
}

export function parseWARCHeader (bufferString) {
  const parts = bufferString.split('\r\n')
  let i = 0
  const [what, version] = parts.shift().split('/')
  const parsed = {
    [what]: version
  }
  for (; i < parts.length; ++i) {
    let part = parts[i]
    if (part) {
      let sep = part.indexOf(': ')
      parsed[part.substring(0, sep)] = part.substring(sep + 2)
    }
  }
  return parsed
}

export function parseWrittenRequestRecord (bufferString) {
  const parts = bufferString.split('\r\n')
  const parsed = {
    WARC: parts.shift().split('/')[1]
  }
  let part = parts.shift()
  while (part) {
    let sep = part.indexOf(': ')
    parsed[part.substring(0, sep)] = part.substring(sep + 2)
    part = parts.shift()
  }
  const http = []
  part = parts.shift()
  while (part) {
    http.push(`${part}\r\n`)
    part = parts.shift()
  }
  parsed.http = http.join('')
  return parsed
}

export function parseWrittenResponseRecord (bufferString) {
  const parts = bufferString.split('\r\n')
  const parsed = {
    WARC: parts.shift().split('/')[1]
  }
  while (true) {
    let part = parts.shift()
    if (part) {
      let sep = part.indexOf(': ')
      parsed[part.substring(0, sep)] = part.substring(sep + 2)
    } else {
      break
    }
  }
  const http = []
  let part = parts.shift()
  while (part) {
    http.push(`${part}\r\n`)
    part = parts.shift()
  }
  parsed.http = http.join('')
  const body = []
  part = parts.shift()
  while (part) {
    body.push(`${part}`)
    part = parts.shift()
  }
  parsed.body = body.join('')
  return parsed
}

export function checkRecordId (recordID) {
  return (
    idRe.test(recordID) &&
    !(recordID.includes('undefined') || recordID.includes('null'))
  )
}

export function makeDate () {
  let now = new Date().toISOString()
  return now.substr(0, now.indexOf('.')) + 'Z'
}

export function countCRLFs (str) {
  return (str.match(crlfRe) || []).length
}
