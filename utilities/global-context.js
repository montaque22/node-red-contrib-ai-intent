class GlobalContext {
  constructor(node) {
    if (!node) {
      throw new Error(
        "Fatal Error: Cannot access global context without a node."
      );
    }
    this.node = node;
  }

  setValueToGlobalContext = (value, key) => {
    const globalContext = getGlobalContext(this.node);

    globalContext.set(key, value);
  };

  getValueFromGlobalContext = (key) => {
    const globalContext = getGlobalContext(this.node);

    return globalContext.get(key);
  };
}

const getGlobalContext = (node) => {
  return node.context().global;
};

module.exports = {
  GlobalContext,
};
