const PubSub = require("pubsub-js");
const { INTENT_STORE } = require("../constants");
const { DidRunOnce } = require("../didRunOnceStore");
const { getErrorMessagesForConfig } = require("./utils");
const { getDatabase } = require("../db");

module.exports = function (RED) {
  function RegisterIntentHandlerNode(config) {
    RED.nodes.createNode(this, config);
    const globalContext = this.context().global;
    const context = globalContext.get(INTENT_STORE) || {};

    const {
      intentId,
      aiDescription,
      confirmationMessage,
      requireConfirmation,
      enableConversation,
    } = config;

    const errorMessage = getErrorMessagesForConfig(config);

    if (errorMessage) {
      // There was an error. Stop.
      return this.error(errorMessage);
    } else {
      context[intentId] = {
        nodeId: this.id,
        name: this.name,
        id: intentId,
        aiDescription,
        confirmationMessage,
        enableConversation,
        requireConfirmation,
      };
    }

    if (!config.requireConfirmation) {
      delete context[intentId].confirmationMessage;
    }

    getDatabase(async (storage) => {
      var intent = await storage.get(intentId);

      if (!intent) {
        // Intent is new. Store the intent since it doesn't exist
        await storage.setItem(intentId, context[intentId]);
      } else if (intent.nodeId !== this.id) {
        // a node is duplicating an intent! Send a warning but allow it.
        // This allows a user o use Register Intent node in multiple places for the same ID.
        // (not sure if this should be allowed)
        this.warn(`A node with intent id ${intentId} already exists!`);
      }
    });

    // Massive storage that holds data to all the Register Intent nodes
    // This allows us to look up this info later in the Call Intent node
    globalContext.set(INTENT_STORE, context);

    const node = this;
    // Call intent node will publish events.
    // This node will only listen for its own intent
    const token = PubSub.subscribe(intentId, function (msg, data) {
      const didRunOnce = new DidRunOnce(globalContext);
      const didRun = didRunOnce.getForKey(intentId);

      if (context[intentId].requireConfirmation) {
        // Although the information passed to the node is the same in both conditions
        // The node will send the data down a different path to help users develop better automations without needing switch nodes
        if (!didRun) {
          didRunOnce.setForKey(intentId, true);
          node.send([null, { ...data, payload: context[intentId] }]);
        } else {
          node.send([data]);
        }
      } else {
        node.send([data]);
      }
    });

    // We need to clean up on close otherwise more than one message is sent when a call is published
    this.on("close", function (removed, done) {
      if (removed) {
        getDatabase(async (storage) => {
          console.log("Remove: ", intentId);
          await storage.removeItem(intentId);
          PubSub.unsubscribe(token);
          done();
        });
      } else {
        PubSub.unsubscribe(token);
        done();
      }
    });
  }

  RED.nodes.registerType("Register Intent", RegisterIntentHandlerNode);
};
