const { INTENT_STORE } = require("./constants");
const { localStorage } = require("./database");

function end(done, error) {
  if (done) {
    done(error);
  }
}

class ContextDatabase {
  constructor() {
    this.globalContext = localStorage;
  }

  getNodeStore() {
    const stringStore = this.globalContext.getItem(INTENT_STORE) || "{}";

    return JSON.parse(stringStore);
  }

  saveIntent(config) {
    const nodeStore = this.getNodeStore();
    nodeStore[config.id] = config;

    this.globalContext.setItem(INTENT_STORE, JSON.stringify(nodeStore));
  }

  removeIntent(config) {
    const nodeStore = this.getNodeStore();
    delete nodeStore[config.id];

    this.globalContext.setItem(INTENT_STORE, JSON.stringify(nodeStore));
  }
}

module.exports = { end, ContextDatabase };
