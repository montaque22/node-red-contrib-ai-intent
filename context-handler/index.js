const Sugar = require("sugar");
const { ACTIVE_CONVERSATION, INTENT_STORE } = require("../constants");

module.exports = function (RED) {
  function ContextHandlerNode(config) {
    RED.nodes.createNode(this, config);

    const node = this;
    let timeoutId;

    function initTimeout(msg, key, ms) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        const globalContext = node.context().global;

        globalContext.set(key, undefined);
        return node.send([null, msg]);
      }, ms);
    }

    node.on("input", function (msg) {
      const { wait, contextId, path, action } = config;
      const key = contextId || msg.payload.contextId;

      if (!path && ["find", "save"].includes(action)) {
        return node.error("Missing path");
      } else if (!key && !["clear intent"].includes(action)) {
        return node.error("Missing id");
      }

      const value = Sugar.Object.get(msg, path);
      const globalContext = node.context().global;

      if (action === "find") {
        value = globalContext.get(key);
        config.path = "";
      } else if (action === "save") {
        globalContext.set(key, value);
      } else if (action === "clear context") {
        config.path = "";
        return initTimeout(msg, key, 0);
      } else if (action === "clear intent") {
        config.path = "";
        return initTimeout(msg, ACTIVE_CONVERSATION, 0);
      } else if (action === "get conversation intent") {
        msg.payload = globalContext.get(ACTIVE_CONVERSATION) || "";

        return node.send([msg]);
      } else if (action === "get registered intents") {
        msg.payload = globalContext.get(INTENT_STORE) || {};

        return node.send([msg]);
      }

      msg.payload = value;

      if (wait === undefined) {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      } else {
        initTimeout(msg, key, wait * 1000 * 60);
      }

      node.send([msg]);
    });
  }
  RED.nodes.registerType("Context Handler", ContextHandlerNode);
};
