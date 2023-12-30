const PubSub = require("pubsub-js");
const { INTENT_STORE } = require("../constants");
const { getDatabase } = require("../db");
const { end } = require("../globalUtils");
let intents;

/**
 * Searches context for an object whose `name` or `id` property matches the given name parameter
 * and returns the matching object.
 * @param {string} name
 * @param {Record<string, object>} context
 * @returns
 */
const getMatchingIntentFromContext = (nameOrID = "", context) => {
  return Object.values(context).find((intent) => {
    return intent.name === nameOrID || intent.id === nameOrID;
  });
};

/**
 * Fires the callback with either an error string or with the node matching the `nameOrId` value
 * from the context.
 * @param {string} nameOrId
 * @param {object} context
 * @param {function} callback
 */
const getNode = (nameOrId, context, callback) => {
  const node = getMatchingIntentFromContext(nameOrId, context);
  if (!nameOrId) {
    callback("payload is missing nodeName property");
  } else if (!node) {
    callback(`There is no registered intent with name or id of "${nameOrId}"`);
  } else {
    callback(null, node);
  }
};

module.exports = function (RED) {
  function CallIntentHandlerNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;

    this.on("input", function (msg, send, done = () => {}) {
      const globalContext = node.context().global;
      const context = globalContext.get(INTENT_STORE) || {};
      const { registeredNodeId = "" } = config;

      send =
        send ||
        function () {
          node.send.apply(node, arguments);
        };

      if (Array.isArray(msg.payload)) {
        msg.payload.forEach((payload) => {
          const { nodeName } = payload;

          getNode(nodeName, context, (err, registeredNode) => {
            if (err) {
              node.warn(err);
            } else {
              PubSub.publishSync(registeredNode.id, msg);
              send(msg);
            }
          });
        });
      } else {
        const nameOrId = msg.payload?.nodeName || registeredNodeId;

        getNode(nameOrId, context, (err, registeredNode) => {
          if (err) {
            node.warn(err);
          } else {
            PubSub.publishSync(registeredNode.id, msg);
            send(msg);
          }
        });
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
