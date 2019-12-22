const isEmpty = require('lodash/isEmpty')

/**
 * Electron requires the use of the debugger to retrieve the requests response body
 * @param {string} requestId - the request to fetch the response body for
 * @param {Object} wcDebugger - the Electron debugger to use to get the response body
 * @see https://electron.atom.io/docs/api/debugger/
 * @return {Promise<?Buffer>} body - the response body as a node buffer
 */
function getResBody (requestId, wcDebugger) {
  return new Promise(resolve => {
    wcDebugger.sendCommand(
      'Network.getResponseBody',
      { requestId },
      (error, body) => {
        resolve(!isEmpty(error) ? null : body)
      }
    )
  })
}

exports.getResBody = getResBody

/**
 * Electron requires the use of the debugger to retrieve the requests post data
 * @param {string} requestId - the request to fetch the post data for
 * @param {Object} wcDebugger - the Electron debugger to use to get the post data
 * @see https://electron.atom.io/docs/api/debugger/
 * @return {Promise<?Buffer>} body - the response body as a node buffer
 */
function getPostData (requestId, wcDebugger) {
  return new Promise(resolve => {
    wcDebugger.sendCommand(
      'Network.getRequestPostData',
      { requestId },
      (error, body) => {
        resolve(!isEmpty(error) ? null : body)
      }
    )
  })
}

exports.getPostData = getPostData
