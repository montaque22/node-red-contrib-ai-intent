const PubSub = require("pubsub-js");
const { end, ContextDatabase } = require("../globalUtils");
const { TYPES} = require("../constants");

/**
 * Searches context for an object whose `name` or `id` property matches the given name parameter
 * and returns the matching object.
 * @param {string} name
 * @param {Record<string, object>} context
 * @returns
 */
const getMatchingIntentFromContext = (nameOrID = "", context) => {
  return Object.values(context).find((intent) => {
    return (
      (intent.name === nameOrID || intent.id === nameOrID) &&
      intent.type === TYPES.RegisterIntent
    );
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

const normalizeNames = (intents = []) => {
  return intents.map((intent) => {
    if (!intent.name && intent.type === TYPES.OpenAITool) {
      const tool = JSON.parse(intent.tool);
      return { ...intent, name: tool.function.name };
    }
    return intent;
  });
};

module.exports = function (RED) {
  const nodeDB = new ContextDatabase(RED);

  function CallIntentHandlerNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;

    this.on("input", function (msg, send, done = () => {}) {
      const nodeStore = nodeDB.getNodeStore();
      const { registeredNodeId = "" } = config;

      send =
        send ||
        function () {
          node.send.apply(node, arguments);
        };

      if (Array.isArray(msg.payload)) {
        msg.payload.forEach((payload) => {
          const { nodeName } = payload;

          getNode(nodeName, nodeStore, (err, registeredNode) => {
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

        getNode(nameOrId, nodeStore, (err, registeredNode) => {
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

  RED.httpAdmin.get("/registered-intents", function (req, res) {
    const nodeStore = nodeDB.getNodeStore();
    const intents = normalizeNames(Object.values(nodeStore));
    res.json(intents);
  });

  RED.nodes.registerType(TYPES.CallIntent, CallIntentHandlerNode, {
    settings: {
      callIntentRegistry: {
        value: [],
        exportable: true,
      },
    },
  });
};
