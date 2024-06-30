const { localStorage } = require("./database");
const KEY = "didRunOnce";

class DidRunOnce {
  constructor() {
    this.context = localStorage;
  }

  setForKey = (key, value) => {
    const STORE = this.context.getItem(KEY) || {};

    STORE[key] = value;

    Object.keys(STORE).forEach((_key) => {
      if (_key !== key) {
        STORE[_key] = false;
      }
    });

    this.context.setItem(KEY, STORE);
  };

  getForKey = (key) => {
    const STORE = this.context.getItem(KEY) || {};

    return STORE[key];
  };

  reset = () => {
    this.context.setItem(KEY, {});
  };
}

module.exports = { DidRunOnce };
