const isEmpty = require('lodash/isEmpty')
const ElectronGetResError = require('./electronGetResError')

/**
 * @desc Electron requires the use of the debugger to retrieve the requests response body
 * @param {string} requestId the request to fetch the response body for
 * @param {Object} wcDebugger the Electron debugger to use to get the response body
 * @see https://electron.atom.io/docs/api/debugger/
 * @return {Promise<Buffer>} body - the response body as a node buffer
 * @throws {ElectronGetResError} - rejects if the error parameter to the callback was set
 */
module.exports = function getResBodyElectron (requestId, wcDebugger) {
  return new Promise((resolve, reject) => {
    wcDebugger.sendCommand(
      'Network.getResponseBody',
      { requestId },
      (error, body) => {
        if (!isEmpty(error)) {
          reject(new ElectronGetResError(error, requestId))
        } else {
          resolve(body)
        }
      }
    )
  })
}
