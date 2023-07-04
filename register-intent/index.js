const PubSub = require("pubsub-js");
const { INTENT_STORE } = require("../constants");
const { DidRunOnce } = require("../didRunOnceStore");
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
    } else {
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

    const node = this;
    var token = PubSub.subscribe(intentId, function (msg, data) {
      const didRunOnce = new DidRunOnce(globalContext);
      const didRun = didRunOnce.getForKey(intentId);

      if (context[intentId].confirmationMessage) {
        if (!didRun) {
          didRunOnce.setForKey(intentId, true);
          node.send([null, { payload: context[intentId] }]);
        } else {
          node.send([data]);
        }
      } else {
        node.send([data]);
      }
    });
  }

  RED.nodes.registerType("Register Intent", RegisterIntentHandlerNode);
};
