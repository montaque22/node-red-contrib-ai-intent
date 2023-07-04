const STORE = {};

module.exports = {
  set: (key, value) => {
    STORE[key] = value;

    Object.keys(STORE).forEach((_key) => {
      if (_key !== key) {
        STORE[_key] = false;
      }
    });
  },
  get: (key) => {
    return STORE[key];
  },
  reset: () => {
    Object.keys(STORE).forEach((key) => {
      STORE[key] = false;
    });
  },
};
