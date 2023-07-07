const PubSub = require("pubsub-js");
const { INTENT_STORE } = require("../constants");
const { DidRunOnce } = require("../didRunOnceStore");
const { getErrorMessagesForConfig } = require("./utils");
const { getIntentsCollection, database } = require("../db");
const intentsCollection = getIntentsCollection();

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

    var intent = intentsCollection.findOne({ id: intentId });

    console.log("EXIST: ", intent);
    if (!intent) {
      console.log("CREATE: ", context[intentId]);
      intentsCollection.insertOne(context[intentId]);
    } else if (intent.nodeId !== this.id) {
      // a node is duplicating an id! Fail it.
      this.warn(`A node with intent id ${intentId} already exists!`);
    }
    var test = intentsCollection.where(function (obj) {
      return !!obj.id;
    });
    console.log("TEST: ", test);
    globalContext.set(INTENT_STORE, context);

    const node = this;
    const token = PubSub.subscribe(intentId, function (msg, data) {
      const didRunOnce = new DidRunOnce(globalContext);
      const didRun = didRunOnce.getForKey(intentId);

      if (context[intentId].confirmationMessage) {
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

    this.on("close", function () {
      PubSub.unsubscribe(token);
      database.close();
    });
  }

  RED.nodes.registerType("Register Intent", RegisterIntentHandlerNode);
};
