class RecSepCounter {
  constructor () {
    this.count = 0
  }

  increment () {
    this.count += 1
  }

  reset () {
    this.count = 0
  }
}

module.exports = RecSepCounter
