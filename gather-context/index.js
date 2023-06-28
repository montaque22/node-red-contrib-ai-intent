const crypto = require("crypto");
const Sugar = require("sugar");
const { CONVERSATION_CONTEXT } = require("../constants");
const { getAmount, getDate, getDuration } = require("./utils");

module.exports = function (RED) {
  function GatherContextHandlerNode(config) {
    RED.nodes.createNode(this, config);
    const UUID = crypto.randomUUID();
    const node = this;

    node.on("input", function (msg) {
      const globalContext = node.context().global;
      const conversationContext = globalContext.get(CONVERSATION_CONTEXT) || {};
      const context = config.context || msg.payload?.context || "";
      const dataSourceKey =
        config.dataSourceKey || msg.payload?.dataSourceKey || "";

      if (!context) {
        return node.error("Missing context");
      } else if (!dataSourceKey) {
        return node.error("Missing data source key");
      }

      const message = Sugar.Object.get(msg, dataSourceKey);
      const nodeContext = conversationContext[UUID] || {};
      const value = nodeContext[context];

      if (value) {
        msg.payload = nodeContext;
        return node.send([msg]);
      }

      msg.payload = {
        amount: getAmount(message),
        duration: getDuration(message),
        date: getDate(message),
      };

      if (!msg.payload[context].length) {
        msg.payload = config.prompt;
        return node.send([null, msg]);
      }

      globalContext.set(CONVERSATION_CONTEXT, {
        ...conversationContext,
        [UUID]: msg.payload,
      });

      return node.send([msg]);
    });
  }
  RED.nodes.registerType("Gather Context", GatherContextHandlerNode);
};
