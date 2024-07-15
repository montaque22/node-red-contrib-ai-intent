const PubSub = require("pubsub-js");
const { getErrorMessagesForConfig } = require("./utils");
const { end, ContextDatabase } = require("../globalUtils");

module.exports = function (RED) {
  function RegisterIntentHandlerNode(config) {
    RED.nodes.createNode(this, config);

    const errorMessage = getErrorMessagesForConfig(config);
    const node = this;
    const nodeDB = new ContextDatabase(RED);
    if (errorMessage) {
      // There was an error. Stop.
      return this.error(errorMessage);
    } else {
      // create a new entry for the given node id
      nodeDB.saveIntent({
        nodeId: node.id,
        ...config,
      });
    }

    // Call intent node will publish events.
    // This node will only listen for its own intent
    const token = PubSub.subscribe(config.id, function (msg, data) {
      const nodeStore = nodeDB.getNodeStore();
      const { name, description, excludeFromOpenAi } = nodeStore[node.id];
      node.send([
        { ...data, _config: { name, description, excludeFromOpenAi } },
      ]);
    });

    // We need to clean up on close otherwise more than one message is sent when a call is published
    this.on("close", function (removed, done) {
      if (removed) {
        nodeDB.removeIntent(config);
        PubSub.unsubscribe(token);
        end(done);
      } else {
        PubSub.unsubscribe(token);
        end(done);
      }
    });
  }

  RED.nodes.registerType("Register Intent", RegisterIntentHandlerNode);
};
