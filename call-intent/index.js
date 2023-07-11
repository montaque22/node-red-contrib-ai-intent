const PubSub = require("pubsub-js");
const { INTENT_STORE, ACTIVE_CONVERSATION } = require("../constants");
const { getDatabase } = require("../db");
let intents;

module.exports = function (RED) {
  function CallIntentHandlerNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;

    this.on("input", function (msg, send, done = () => {}) {
      const globalContext = node.context().global;
      const context = globalContext.get(INTENT_STORE) || {};
      const intentId = config.intentId || msg.payload?.intentId || "";
      const message = config.message || msg.payload?.message || "";
      send =
        send ||
        function () {
          node.send.apply(node, arguments);
        };

      if (!intentId) {
        return node.error("Missing intent id");
      } else if (!context[intentId]) {
        node.warn("There is no registered intent with id: ", intentId);
        send(msg);
        return done();
      }

      const payload = context[intentId];

      if (payload.enableConversation) {
        globalContext.set(ACTIVE_CONVERSATION, intentId);
      }

      msg.payload = { ...payload, message };
      PubSub.publishSync(intentId, msg);
      send(msg);
      done();
    });
  }

  getDatabase(async (storage) => {
    intents = await storage.values();

    RED.nodes.registerType("Call Intent", CallIntentHandlerNode, {
      settings: {
        callIntentRegistry: {
          value: intents,
          exportable: true,
        },
      },
    });
  });

  RED.httpAdmin.get("/registered-intents", function (req, res) {
    getDatabase(async (storage) => {
      intents = await storage.values();
      res.json(intents);
    });
  });
};
