const { $$asyncIterator } = require('iterall');

module.exports.createEmptyIterable = function () {
  return {
    next() {
      return Promise.resolve({ value: undefined, done: true });
    },
    return() {
      return Promise.resolve({ value: undefined, done: true });
    },
    throw(e) {
      return Promise.reject(e);
    },
    [$$asyncIterator]() {
      return this;
    },
  };
};