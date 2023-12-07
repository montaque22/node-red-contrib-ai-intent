const PubSub = require("pubsub-js");
const { INTENT_STORE } = require("../constants");
const { getDatabase } = require("../db");
const { end } = require("../globalUtils");
let intents;

/**
 * Searches context for an object whose `name` property matches the given name parameter
 * and returns the matching object.
 * @param {string} name
 * @param {Record<string, object>} context
 * @returns
 */
const getIntentWithName = (name, context) => {
  return Object.values(context).find((intent) => intent.name === name);
};

module.exports = function (RED) {
  function CallIntentHandlerNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;

    this.on("input", function (msg, send, done = () => {}) {
      const globalContext = node.context().global;
      const context = globalContext.get(INTENT_STORE) || {};
      let intentName = config.intentName || "";

      send =
        send ||
        function () {
          node.send.apply(node, arguments);
        };

      if (Array.isArray(msg.payload)) {
        msg.payload.forEach((payload) => {
          const { functionName } = payload;
          if (!functionName) {
            node.warn("payload is missing functionName property");
          } else if (!getIntentWithName(functionName, context)) {
            node.warn(
              "There is no registered intent with name: ",
              functionName
            );
          } else {
            msg.payload = getIntentWithName(functionName, context);
            PubSub.publishSync(functionName, msg);
            send(msg);
          }
        });
      } else {
        msg.payload = getIntentWithName(functionName, context);
        PubSub.publishSync(intentName, msg);
        send(msg);
      }

      end(done);
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
