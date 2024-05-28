const { INTENT_STORE } = require("./constants");

function end(done, error) {
  if (done) {
    done(error);
  }
}

class ContextDatabase {
  constructor(globalContext) {
    this.globalContext = globalContext;
  }

  getNodeStore(id) {
    return this.globalContext.get(INTENT_STORE) || {};
  }

  saveIntent(config) {
    const nodeStore = this.getNodeStore();
    nodeStore[config.id] = config;

    this.globalContext.set(INTENT_STORE, nodeStore);
  }

  removeIntent(config) {
    const nodeStore = this.getNodeStore();
    delete nodeStore[config.id];

    this.globalContext.set(INTENT_STORE, nodeStore);
  }
}

module.exports = { end, ContextDatabase };
