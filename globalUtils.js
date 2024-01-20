const { INTENT_STORE } = require("./constants");
const { getDatabase } = require("./db");

function end(done, error) {
  if (done) {
    done(error);
  }
}

class ContextDatabase {
  constructor(globalContext, config) {
    this.globalContext = globalContext;
    this.nodeStore = this.globalContext.get(INTENT_STORE) || {};
    this.config = config;
    // create a new entry for the given node id
    this.nodeStore[this.config.id] = config;
  }

  initialize() {
    const id = this.config.id;
    // Trigger database save
    getDatabase(async (storage) => {
      // get intent data for given node id
      const savedTool = await storage.get(id);

      if (!savedTool || savedTool.id === id) {
        // Tool is new OR updating existing tool
        await storage.setItem(id, this.nodeStore[id]);
      }
    });

    // Massive storage that holds data to all the Register Intent nodes
    // This allows us to look up this info later in the Call Intent node
    this.globalContext.set(INTENT_STORE, this.nodeStore);
  }

  deleteNode(cb = () => {}) {
    getDatabase(async (storage) => {
      console.log("Removing: ", this.config.name);
      const nodeId = this.config.id;
      const nodeStore = this.globalContext.get(INTENT_STORE) || {};
      delete nodeStore[nodeId];
      this.globalContext.set(INTENT_STORE, nodeStore);

      await storage.removeItem(nodeId);
      cb();
    });
  }

  getNodesFromStore() {
    return new Promise((resolve) => {
      getDatabase((storage) => {
        resolve(storage.values());
      });
    });
  }
}

module.exports = { end, ContextDatabase };
