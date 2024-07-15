const { INTENT_STORE, LOCAL_STORAGE_PATH} = require("./constants");
const { getStorageAtLocation } = require("./database");

function end(done, error) {
  if (done) {
    done(error);
  }
}

class ContextDatabase {
  constructor(RED) {
    const {functionGlobalContext = {} } = RED.settings
    const path = functionGlobalContext[LOCAL_STORAGE_PATH]

    this.globalContext = getStorageAtLocation(path);
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
