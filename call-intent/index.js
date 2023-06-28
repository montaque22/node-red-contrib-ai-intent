const PubSub = require("pubsub-js");
const { INTENT_STORE, ACTIVE_CONVERSATION } = require("../constants");

module.exports = function (RED) {
  function CallIntentHandlerNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;
    config.rope = "dope";
    this.mope = "nope";

    node.on("input", function (msg) {
      const globalContext = this.context().global;
      const context = globalContext.get(INTENT_STORE) || {};
      const intentId = config.intentId || msg.payload?.intentId || "";
      const message = config.message || msg.payload?.message || "";

      if (!intentId) {
        return this.error("Missing intent id");
      } else if (!context[intentId]) {
        this.warn("There is no registered intent with id: ", intentId);
        return node.send(msg);
      }
      const payload = context[intentId];

      if (payload.enableConversation) {
        globalContext.set(ACTIVE_CONVERSATION, data.intentId);
      }
      node.log("Send Data: ", msg);
      msg.payload = { ...payload, message };
      PubSub.publishSync(intentId, msg);
      node.send(msg);
    });
  }

  RED.nodes.registerType("Call Intent", CallIntentHandlerNode);
};
