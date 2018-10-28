/**
 * @type {boolean}
 */
let asyncGenFns = true
try {
  new Function('async function* test(){yield await Promise.resolve(1)}')
} catch (error) {
  asyncGenFns = false
}

/**
 * @type {boolean}
 */
module.exports = asyncGenFns && typeof Symbol.asyncIterator !== 'undefined'
