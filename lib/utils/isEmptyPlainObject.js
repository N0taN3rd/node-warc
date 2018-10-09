const isEmpty = require('lodash.isempty')

/**
 * @desc Test to see if a ``plain object`` is empty
 * @param {Object?} object
 * @return {boolean}
 */
function isEmptyPlainObject (object) {
  if (object == null) {
    return true
  }
  return isEmpty(object)
}

module.exports = isEmptyPlainObject
