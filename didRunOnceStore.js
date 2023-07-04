const KEY = "didRunOnce";

class DidRunOnce {
  constructor(globalContext) {
    this.context = globalContext;
  }

  setForKey = (key, value) => {
    const STORE = this.context.get(KEY) || {};

    STORE[key] = value;

    Object.keys(STORE).forEach((_key) => {
      if (_key !== key) {
        STORE[_key] = false;
      }
    });

    this.context.set(KEY, STORE);
  };

  getForKey = (key) => {
    const STORE = this.context.get(KEY) || {};

    return STORE[key];
  };

  reset = () => {
    this.context.set(KEY, {});
  };
}

module.exports = { DidRunOnce };
