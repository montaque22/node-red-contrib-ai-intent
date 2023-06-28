const PubSub = require("pubsub-js");
const { INTENT_STORE } = require("../constants");
const { getErrorMessagesForConfig } = require("./utils");

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
    } else if (!context[intentId]) {
      context[intentId] = {
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

    globalContext.set(INTENT_STORE, context);

    // this.send([{ payload: context[config.intentId] }]);

    const node = this;
    var token = PubSub.subscribe(intentId, function (msg, data) {
      node.log("Got Data: ", data);
      node.send(data);
    });
  }

  RED.nodes.registerType("Register Intent", RegisterIntentHandlerNode);
};
