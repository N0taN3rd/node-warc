/**
 * Electron debugger errors passed to the callback are plain objects not Errors
 * but contain information concerning the error.
 */
class ElectronGetResError extends Error {
  /**
   * @param {Object} oError - the error supplied to the callback
   * @param {string} rid - the request id of the request retrieval of the response body failed for
   */
  constructor (oError, rid) {
    super(
      oError.message ||
        `An Error Occurred retrieving the response body for ${rid}`
    )

    /**
     * the original error object supplied to the callback
     * @type {Object}
     */
    this.oError = oError
    /**
     * the request id of the request retrieval of the response body failed for
     * @type {string}
     */
    this.rid = rid
  }
}

module.exports = ElectronGetResError
