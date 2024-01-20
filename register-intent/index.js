const PubSub = require("pubsub-js");
const { INTENT_STORE } = require("../constants");
const { getErrorMessagesForConfig } = require("./utils");
const { getDatabase } = require("../db");
const { end } = require("../globalUtils");

const doesIntentWithNameExist = (nodeId = "", context) => {
  const { name } = context[nodeId];
  return (
    Object.values(context).filter((intent) => {
      return intent.name === name;
    }).length > 1
  );
};

module.exports = function (RED) {
  function RegisterIntentHandlerNode(config) {
    RED.nodes.createNode(this, config);
    const globalContext = this.context().global;
    const context = globalContext.get(INTENT_STORE) || {};
    const errorMessage = getErrorMessagesForConfig(config);
    const nodeId = this.id;

    if (errorMessage) {
      // There was an error. Stop.
      return this.error(errorMessage);
    } else {
      // create a new entry for the given node id
      context[nodeId] = {
        nodeId: nodeId,
        ...config,
      };
    }

    // Trigger database save
    getDatabase(async (storage) => {
      // get intent data for given node id
      var intent = await storage.get(nodeId);

      if (!intent) {
        // Intent is new. Store the intent since it doesn't exist
        await storage.setItem(nodeId, context[nodeId]);
      } else if (intent.nodeId !== nodeId) {
        // a node is either duplicating an intent or the same node is updating! Send a warning but allow it.
        this.warn(
          `Overwriting intent named "${config.name}" for node id ${nodeId} already exists!`
        );
      } else {
        //Update existing intent with new attributes
        await storage.setItem(nodeId, context[nodeId]);
      }
    });

    // Massive storage that holds data to all the Register Intent nodes
    // This allows us to look up this info later in the Call Intent node
    globalContext.set(INTENT_STORE, context);

    const node = this;

    // Call intent node will publish events.
    // This node will only listen for its own intent
    const token = PubSub.subscribe(config.id, function (msg, data) {
      const { name, description, excludeFromOpenAi } = context[nodeId];
      node.send([
        { ...data, _config: { name, description, excludeFromOpenAi } },
      ]);
    });

    // We need to clean up on close otherwise more than one message is sent when a call is published
    this.on("close", function (removed, done) {
      if (removed) {
        getDatabase(async (storage) => {
          console.log("Remove: ", config.name);
          const context = globalContext.get(INTENT_STORE) || {};
          delete context[nodeId];
          globalContext.set(INTENT_STORE, context);

          await storage.removeItem(nodeId);
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
