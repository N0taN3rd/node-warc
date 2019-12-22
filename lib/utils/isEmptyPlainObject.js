'use strict'
const isEmpty = require('lodash/isEmpty')

/**
 * Test to see if a ``plain object`` is empty
 * @param {?Object} object
 * @return {boolean}
 */
module.exports = function isEmptyPlainObject (object) {
  if (object == null) {
    return true
  }
  return isEmpty(object)
}
