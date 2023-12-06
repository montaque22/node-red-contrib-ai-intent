const PubSub = require("pubsub-js");
const { INTENT_STORE } = require("../constants");
const { getErrorMessagesForConfig } = require("./utils");
const { getDatabase } = require("../db");
const { end } = require("../globalUtils");

module.exports = function (RED) {
  function RegisterIntentHandlerNode(config) {
    RED.nodes.createNode(this, config);
    const globalContext = this.context().global;
    const context = globalContext.get(INTENT_STORE) || {};
    const errorMessage = getErrorMessagesForConfig(config);

    if (errorMessage) {
      // There was an error. Stop.
      return this.error(errorMessage);
    } else {
      context[config.name] = {
        nodeId: this.id,
        ...config,
      };
    }

    getDatabase(async (storage) => {
      var intent = await storage.get(config.name);

      if (!intent) {
        // Intent is new. Store the intent since it doesn't exist
        await storage.setItem(config.name, context[config.name]);
      } else if (intent.nodeId !== this.id) {
        // a node is duplicating an intent! Send a warning but allow it.
        // This allows a user o use Register Intent node in multiple places for the same ID.
        // (not sure if this should be allowed)
        this.warn(`A node with intent name ${config.name} already exists!`);
      }
    });

    // Massive storage that holds data to all the Register Intent nodes
    // This allows us to look up this info later in the Call Intent node
    globalContext.set(INTENT_STORE, context);

    const node = this;

    // Call intent node will publish events.
    // This node will only listen for its own intent
    const token = PubSub.subscribe(config.name, function (msg, data) {
      node.send([{ ...data, payload: context[config.name] }]);
    });

    // We need to clean up on close otherwise more than one message is sent when a call is published
    this.on("close", function (removed, done) {
      if (removed) {
        getDatabase(async (storage) => {
          console.log("Remove: ", config.name);
          await storage.removeItem(config.name);
          PubSub.unsubscribe(token);
          end(done);
        });
      } else {
        PubSub.unsubscribe(token);
        end(done);
      }
    });
  }

  RED.nodes.registerType("Register Intent", RegisterIntentHandlerNode);
};
